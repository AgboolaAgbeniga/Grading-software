const form = document.getElementById('report-form');
const resultContainer = document.getElementById('result');

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

const actionsContainer = document.getElementById('actions');
const downloadPdfBtn = document.getElementById('download-pdf');
const downloadJpegBtn = document.getElementById('download-jpeg');

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
    const response = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task1a: { liveUrl: task1aLive, repoUrl: task1aRepo },
        task1b: { liveUrl: task1bLive, repoUrl: task1bRepo }
      })
    });
    const report = await response.json();
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

async function captureReport() {
  document.body.classList.add('capturing');
  // Wait a bit for CSS transitions if any
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Expand all details temporarily for capture
  const details = document.querySelectorAll('details');
  const detailsStates = Array.from(details).map(d => d.open);
  details.forEach(d => d.open = true);

  const canvas = await html2canvas(resultContainer, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  });

  // Restore details states
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
    alert('Failed to generate PDF. Please try again.');
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
    alert('Failed to generate JPEG. Please try again.');
  } finally {
    downloadJpegBtn.disabled = false;
    downloadJpegBtn.textContent = 'Download JPEG Image';
  }
});
