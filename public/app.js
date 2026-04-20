// Constants for scoring
const MAX_IDS_1A = 12;
const MAX_IDS_1B = 8;

const form = document.getElementById('report-form');
const resultContainer = document.getElementById('result');
const actionsContainer = document.getElementById('actions');
const downloadPdfBtn = document.getElementById('download-pdf');
const downloadJpegBtn = document.getElementById('download-jpeg');

// Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.tab}-tab`).classList.remove('hidden');
    resultContainer.classList.add('hidden');
    actionsContainer.classList.add('hidden');
  });
});

async function gradeIntern(data) {
  const response = await fetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(`Server returned ${response.status}`);
  return await response.json();
}

function renderList(title, items) {
  if (!items || items.length === 0) return '';
  return `
    <div class="report-section">
      <h4>${title}</h4>
      <ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>
    </div>
  `;
}

function renderFoundById(foundById) {
  if (!foundById) return '';
  const entries = Object.entries(foundById).filter(([, paths]) => paths.length > 0);
  if (entries.length === 0) return '';
  return `
    <div class="report-section">
      <h4>Repository coverage</h4>
      <ul>
        ${entries
          .map(
            ([id, paths]) =>
              `<li><strong>${id}</strong>: found in ${paths.length} file${paths.length > 1 ? 's' : ''} <span class="small-text">(${paths.join(', ')})</span></li>`
          )
          .join('')}
      </ul>
    </div>
  `;
}

function renderStatusSummary(title, report) {
  const liveOK = report.live.success;
  const repoOK = report.repo.success && report.repo.sourceAnalysis?.success;
  const statusClass = liveOK && repoOK ? 'pass' : 'fail';
  const statusText = liveOK && repoOK ? 'PASS' : 'REVIEW';
  const analysis = report.repo.sourceAnalysis || {};

  return `
    <div class="report-card">
      <div class="report-header">
        <h3>${title}</h3>
        <div class="status ${statusClass}">${statusText}</div>
      </div>
      <div class="report-grid">
        <div class="report-section">
          <h4>Live site</h4>
          <p>${report.live.message}</p>
          <p><strong>Status code:</strong> ${report.live.status || 'N/A'}</p>
          <p><strong>Found IDs:</strong> ${report.live.found?.length || 0}</p>
          <p><strong>Missing IDs:</strong> ${report.live.missing?.length || 0}</p>
        </div>
        <div class="report-section">
          <h4>Repository</h4>
          <p>${report.repo.message}</p>
          <p><strong>Repo:</strong> ${report.repo.repoInfo ? `${report.repo.repoInfo.owner}/${report.repo.repoInfo.repo}` : 'N/A'}</p>
          <p><strong>Branch:</strong> ${report.repo.repoInfo?.defaultBranch || 'N/A'}</p>
          <p><strong>Description:</strong> ${report.repo.repoInfo?.description || 'No description available.'}</p>
          <p><strong>Files scanned:</strong> ${analysis.filesScanned ?? 'N/A'}</p>
        </div>
      </div>
      <div class="report-grid">
        ${renderList('Missing live IDs', report.live.missing)}
        ${renderList('Missing repository IDs', analysis.missing)}
      </div>
      ${renderFoundById(analysis.foundById)}
      ${report.repo.repoInfo?.readmeText ? `<details class="report-section"><summary>README preview</summary><pre>${report.repo.repoInfo.readmeText.slice(0, 600).replace(/</g, '&lt;')}</pre></details>` : ''}
    </div>
  `;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const task1aLive = document.getElementById('task1a-live').value.trim();
  const task1aRepo = document.getElementById('task1a-repo').value.trim();
  const task1bLive = document.getElementById('task1b-live').value.trim();
  const task1bRepo = document.getElementById('task1b-repo').value.trim();

  resultContainer.classList.add('hidden');
  actionsContainer.classList.add('hidden');
  resultContainer.innerHTML = '<p>Generating report…</p>';
  resultContainer.classList.remove('hidden');

  try {
    const report = await gradeIntern({
      task1a: { liveUrl: task1aLive, repoUrl: task1aRepo },
      task1b: { liveUrl: task1bLive, repoUrl: task1bRepo }
    });
    const internName = report.task1b.live.extractedName || report.task1a.repo.repoInfo?.owner || 'Unknown Intern';

    resultContainer.innerHTML = `
      <div class="report-branding">
        <h3>HNG Internship</h3>
        <p>Frontend Track - Task Evaluation Report</p>
      </div>
      <h2>Grading Report: ${internName}</h2>
      <p class="small-text">Generated at: ${new Date(report.generatedAt).toLocaleString()}</p>
      ${renderStatusSummary('Task 1A', report.task1a)}
      ${renderStatusSummary('Task 1B', report.task1b)}
      <details><summary>Raw JSON report</summary><pre>${JSON.stringify(report, null, 2)}</pre></details>
    `;
    actionsContainer.classList.remove('hidden');
  } catch (error) {
    resultContainer.innerHTML = `<p class="status fail">Unable to generate report: ${error.message}</p>`;
  }
});

// --- Mass Grading Logic ---
const csvUpload = document.getElementById('csv-upload');
const dropZone = document.getElementById('drop-zone');
const bulkControls = document.getElementById('bulk-controls');
const fileInfo = document.getElementById('file-info');
const startBulkBtn = document.getElementById('start-mass-grading');
const bulkResult = document.getElementById('bulk-result');
const massGradingTableBody = document.querySelector('#mass-grading-table tbody');
const downloadBulkCsvBtn = document.getElementById('download-bulk-csv');

const statTotal = document.getElementById('stat-total');
const statPass = document.getElementById('stat-pass');
const statFail = document.getElementById('stat-fail');
const filterBtns = document.querySelectorAll('.filter-btn');

let bulkData = [];
let bulkResults = [];

function updateStats() {
  statTotal.textContent = bulkResults.length;
  statPass.textContent = bulkResults.filter(r => r.Passed === 'YES').length;
  statFail.textContent = bulkResults.filter(r => r.Passed === 'NO' || r.Passed === 'ERROR').length;
}

function filterTable(filter) {
  const rows = massGradingTableBody.querySelectorAll('tr');
  rows.forEach(row => {
    const status = row.dataset.status;
    if (filter === 'all') {
      row.classList.remove('hidden');
    } else if (filter === 'pass' && status === 'PASS') {
      row.classList.remove('hidden');
    } else if (filter === 'review' && status === 'REVIEW') {
      row.classList.remove('hidden');
    } else if (filter === 'fail' && (status === 'ERROR' || status === 'FAIL')) {
      row.classList.remove('hidden');
    } else {
      row.classList.add('hidden');
    }
  });
}

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterTable(btn.dataset.filter);
  });
});

function handleFile(file) {
  if (!file) return;
  fileInfo.textContent = `Reading ${file.name}...`;
  bulkControls.classList.remove('hidden');
  
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      bulkData = results.data;
      fileInfo.textContent = `File loaded: ${file.name} (${bulkData.length} records)`;
      startBulkBtn.disabled = false;
    },
    error: (err) => {
      fileInfo.textContent = `Error parsing file: ${err.message}`;
      startBulkBtn.disabled = true;
    }
  });
}

csvUpload.addEventListener('change', (e) => handleFile(e.target.files[0]));

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFile(e.dataTransfer.files[0]);
});

startBulkBtn.addEventListener('click', async () => {
  startBulkBtn.disabled = true;
  bulkResult.classList.remove('hidden');
  massGradingTableBody.innerHTML = '';
  bulkResults = [];
  updateStats();

  bulkData.forEach((row, index) => {
    const tr = document.createElement('tr');
    tr.id = `row-${index}`;
    tr.dataset.status = 'PENDING';
    tr.innerHTML = `
      <td>${row['Slack ID (Abdul.tsx)'] || 'N/A'}</td>
      <td class="task1a-score">-</td>
      <td class="task1b-score">-</td>
      <td class="avg-score">-</td>
      <td><span class="status-badge pending">Pending</span></td>
    `;
    massGradingTableBody.appendChild(tr);
  });

  const concurrencyLimit = 3;
  for (let i = 0; i < bulkData.length; i += concurrencyLimit) {
    const chunk = bulkData.slice(i, i + concurrencyLimit);
    await Promise.all(chunk.map(async (row, chunkIndex) => {
      const rowIndex = i + chunkIndex;
      const rowEl = document.getElementById(`row-${rowIndex}`);
      const statusBadge = rowEl.querySelector('.status-badge');
      statusBadge.className = 'status-badge processing';
      statusBadge.textContent = 'Processing...';

      try {
        const payload = {
          task1a: { liveUrl: row['Stage 1a Live URL'], repoUrl: row['Stage 1a Github Repo'] },
          task1b: { liveUrl: row['Stage 1b Live URL'], repoUrl: row['Stage 1b Github Repo'] }
        };

        const report = await gradeIntern(payload);
        
        // Anti-Cheat / Integrity Checks
        const task1aLiveOK = report.task1a.live.success && report.task1a.live.status === 200;
        const task1aRepoOK = report.task1a.repo.success;
        const task1bLiveOK = report.task1b.live.success && report.task1b.live.status === 200;
        const task1bRepoOK = report.task1b.repo.success;

        const integrityIssues = [
          !task1aLiveOK ? `1A Live Unreachable (${report.task1a.live.status || 'Error'})` : '',
          !task1aRepoOK ? `1A Repo Inaccessible (${report.task1a.repo.message || 'Private/Missing'})` : '',
          !task1bLiveOK ? `1B Live Unreachable (${report.task1b.live.status || 'Error'})` : '',
          !task1bRepoOK ? `1B Repo Inaccessible (${report.task1b.repo.message || 'Private/Missing'})` : ''
        ].filter(Boolean);

        // Calculate scores
        const uniqueIds1A = new Set([...report.task1a.live.found, ...(report.task1a.repo.sourceAnalysis?.found || [])]);
        const score1A = (uniqueIds1A.size / MAX_IDS_1A) * 10;

        const uniqueIds1B = new Set([...report.task1b.live.found, ...(report.task1b.repo.sourceAnalysis?.found || [])]);
        const score1B = (uniqueIds1B.size / MAX_IDS_1B) * 10;

        const totalScore = score1A + score1B;
        const avgScore = totalScore / 2;
        
        // Strict Passing: Must have valid links AND score >= 7
        const passed = integrityIssues.length === 0 && avgScore >= 7;

        rowEl.querySelector('.task1a-score').textContent = score1A.toFixed(1);
        rowEl.querySelector('.task1b-score').textContent = score1B.toFixed(1);
        rowEl.querySelector('.avg-score').textContent = avgScore.toFixed(1);
        
        const status = (integrityIssues.length > 0) ? 'FAIL' : (passed ? 'PASS' : 'REVIEW');
        rowEl.dataset.status = status;
        statusBadge.className = `status-badge ${status.toLowerCase()}`;
        statusBadge.textContent = status;

        const comment = [
          ...integrityIssues.map(issue => `🚨 ${issue}`),
          report.task1a.live.missing.length ? `1A Missing IDs: ${report.task1a.live.missing.join(',')}` : '',
          report.task1b.live.missing.length ? `1B Missing IDs: ${report.task1b.live.missing.join(',')}` : ''
        ].filter(Boolean).join(' | ');

        bulkResults.push({
          "Slack Display Name": row['Slack ID (Abdul.tsx)'],
          "Slack Email": row['Slack Email'],
          "1a score": score1A.toFixed(1),
          "1b score": score1B.toFixed(1),
          "Average Score": avgScore.toFixed(1),
          "Total Score": totalScore.toFixed(1),
          "Passed": passed ? 'YES' : 'NO',
          "Comment": comment || "All requirements and integrity checks passed."
        });
      } catch (err) {
        rowEl.dataset.status = 'ERROR';
        statusBadge.className = 'status-badge error';
        statusBadge.textContent = 'Error';
        bulkResults.push({
          "Slack Display Name": row['Slack ID (Abdul.tsx)'],
          "Slack Email": row['Slack Email'],
          "Passed": 'ERROR',
          "Comment": `System Error: ${err.message}`
        });
      }
      updateStats();
    }));
  }
  
  startBulkBtn.disabled = false;
  startBulkBtn.textContent = 'Grading Complete';
});

downloadBulkCsvBtn.addEventListener('click', () => {
  const csv = Papa.unparse(bulkResults);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `HNG-Mass-Grading-${Date.now()}.csv`);
  link.click();
});

// --- Original Capture/Export Logic ---
async function captureReport() {
  document.body.classList.add('capturing');
  await new Promise(resolve => setTimeout(resolve, 500));
  const details = document.querySelectorAll('details');
  const detailsStates = Array.from(details).map(d => d.open);
  details.forEach(d => d.open = true);
  const canvas = await html2canvas(resultContainer, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  });
  details.forEach((d, i) => d.open = detailsStates[i]);
  document.body.classList.remove('capturing');
  return canvas;
}

downloadPdfBtn.addEventListener('click', async () => {
  try {
    downloadPdfBtn.disabled = true;
    downloadPdfBtn.textContent = 'Preparing PDF...';
    const canvas = await captureReport();
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`HNG-Grading-Report-${Date.now()}.pdf`);
  } catch (error) {
    console.error('PDF export failed:', error);
    alert('Failed to generate PDF.');
  } finally {
    downloadPdfBtn.disabled = false;
    downloadPdfBtn.textContent = 'Download PDF Report';
  }
});

downloadJpegBtn.addEventListener('click', async () => {
  try {
    downloadJpegBtn.disabled = true;
    downloadJpegBtn.textContent = 'Preparing Image...';
    const canvas = await captureReport();
    const link = document.createElement('a');
    link.download = `HNG-Grading-Report-${Date.now()}.jpeg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  } catch (error) {
    console.error('JPEG export failed:', error);
    alert('Failed to generate JPEG.');
  } finally {
    downloadJpegBtn.disabled = false;
    downloadJpegBtn.textContent = 'Download JPEG Image';
  }
});
