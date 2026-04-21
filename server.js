const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const TASK1A_TESTIDS = [
  'test-todo-card',
  'test-todo-title',
  'test-todo-description',
  'test-todo-due-date',
  'test-todo-time-remaining',
  'test-todo-status',
  'test-todo-status-control',
  'test-todo-priority-indicator',
  'test-todo-tags',
  'test-todo-edit-button',
  'test-todo-delete-button',
  'test-todo-edit-form',
  'test-todo-edit-title-input',
  'test-todo-edit-description-input',
  'test-todo-edit-priority-select',
  'test-todo-edit-due-date-input',
  'test-todo-save-button',
  'test-todo-cancel-button',
  'test-todo-expand-toggle',
  'test-todo-collapsible-section',
  'test-todo-overdue-indicator'
];

const TASK1B_TESTIDS = [
  'test-profile-card',
  'test-user-name',
  'test-user-bio',
  'test-user-time',
  'test-user-avatar',
  'test-user-social-links',
  'test-user-hobbies',
  'test-user-dislikes'
];

function normalizeUrl(value) {
  if (!value || typeof value !== 'string') return null;
  let url = value.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  try {
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } catch (error) {
    return { ok: false, status: null, error: error.message };
  }
}

function parseGitHubRepo(sourceUrl) {
  if (!sourceUrl) return null;
  const match = sourceUrl.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/|$)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/i, '') };
}

async function fetchGitHubJson(url) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'grading-platform'
  };

  // Add GitHub Token if available in environment variables to avoid rate limiting
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });
    const body = await response.json();
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return { ok: false, status: null, body: { message: error.message } };
  }
}

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'grading-platform' }
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } catch (error) {
    return { ok: false, status: null, text: null, error: error.message };
  }
}

function pathHasRelevantExtension(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  return ['html', 'htm', 'js', 'jsx', 'ts', 'tsx', 'css', 'md'].includes(ext);
}

async function analyzeRepoSources(owner, repo, branch, requiredTestIds) {
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const treeResult = await fetchGitHubJson(treeUrl);
  if (!treeResult.ok || !treeResult.body?.tree) {
    return {
      success: false,
      message: `Unable to fetch repository tree for branch ${branch}.`,
      found: [],
      missing: [...requiredTestIds],
      filesScanned: 0,
      foundById: Object.fromEntries(requiredTestIds.map((id) => [id, []]))
    };
  }

  const relevantFiles = treeResult.body.tree
    .filter((item) => item.type === 'blob' && pathHasRelevantExtension(item.path))
    .slice(0, 80);

  const foundById = Object.fromEntries(requiredTestIds.map((id) => [id, []]));
  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;

  await Promise.all(relevantFiles.map(async (file) => {
    const filePath = file.path.split('/').map(encodeURIComponent).join('/');
    const rawUrl = `${rawBase}${filePath}`;
    const fetched = await fetchText(rawUrl);
    if (!fetched.ok || !fetched.text) {
      return;
    }

    requiredTestIds.forEach((id) => {
      if (fetched.text.includes(id)) {
        foundById[id].push(file.path);
      }
    });
  }));

  const found = requiredTestIds.filter((id) => foundById[id].length > 0);
  const missing = requiredTestIds.filter((id) => foundById[id].length === 0);

  return {
    success: missing.length === 0,
    message: missing.length === 0
      ? 'All required test IDs were found in repository files.'
      : `${missing.length} required test IDs missing from scanned repository files.`,
    found,
    missing,
    filesScanned: relevantFiles.length,
    foundById
  };
}

async function inspectLivePage(url, requiredTestIds) {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    return { success: false, message: 'Invalid live URL', found: [], missing: [...requiredTestIds], status: null, extractedName: null };
  }

  const result = await fetchHtml(normalized);
  if (!result.ok) {
    return { success: false, message: `Live site unreachable (status ${result.status})`, found: [], missing: [...requiredTestIds], status: result.status, extractedName: null };
  }

  const found = requiredTestIds.filter((id) => result.text.includes(id));
  const missing = requiredTestIds.filter((id) => !found.includes(id));

  // Technical Audit for Task 1B
  const technicalAudit = {
    semanticHtml: true,
    timeValid: true,
    accessibility: true,
    errors: []
  };

  // Extract name if test-user-name is present (specifically for Task 1B)
  let extractedName = null;
  if (found.includes('test-user-name')) {
    const nameMatch = result.text.match(/data-testid=["']test-user-name["'][^>]*>([^<]+)</i);
    if (nameMatch && nameMatch[1]) {
      extractedName = nameMatch[1].trim();
    }
  }

  // Task 1A specific validation
  if (requiredTestIds.includes('test-todo-card')) {
    // Accessibility: Expand toggle must use aria-expanded and aria-controls
    if (found.includes('test-todo-expand-toggle')) {
      const toggleMatch = result.text.match(/data-testid=["']test-todo-expand-toggle["'][^>]*aria-expanded=/i);
      const controlsMatch = result.text.match(/data-testid=["']test-todo-expand-toggle["'][^>]*aria-controls=/i);
      if (!toggleMatch || !controlsMatch) {
         technicalAudit.accessibility = false;
         technicalAudit.errors.push('Expand toggle must use aria-expanded and aria-controls.');
      }
    }
    // Accessibility: Time/Overdue updates should use aria-live
    if (found.includes('test-todo-time-remaining') || found.includes('test-todo-overdue-indicator')) {
      if (!result.text.match(/aria-live=["']polite["']/i)) {
        technicalAudit.accessibility = false;
        technicalAudit.errors.push('Dynamic time updates should use aria-live="polite".');
      }
    }
  }

  // Task 1B specific validation
  if (requiredTestIds.includes('test-profile-card')) {
    // Check if test-user-time is a valid epoch timestamp in ms (e.g. 13 digits)
    if (found.includes('test-user-time')) {
      const timeMatch = result.text.match(/data-testid=["']test-user-time["'][^>]*>([^<]+)</i);
      if (timeMatch && timeMatch[1]) {
        const valStr = timeMatch[1].trim();
        const val = parseInt(valStr);
        const now = Date.now();
        const isMs = valStr.length >= 13;
        if (isNaN(val) || Math.abs(now - val) > 3600000 || !isMs) {
          technicalAudit.timeValid = false;
          technicalAudit.errors.push('test-user-time must be a valid epoch timestamp in milliseconds.');
        }
      }
    }

    // Check for article / header / figure / nav semantics
    if (found.includes('test-profile-card') && !result.text.match(/<article[^>]*data-testid=["']test-profile-card["']/i)) {
      technicalAudit.semanticHtml = false;
      technicalAudit.errors.push('Task 1B requires semantic <article> for the card.');
    }
    if (!result.text.match(/<(header|h2)[^>]*data-testid=["']test-user-name["']/i)) {
      technicalAudit.semanticHtml = false;
      technicalAudit.errors.push('Name element should be inside <header> or <h2>.');
    }
    if (found.includes('test-user-social-links') && !result.text.match(/<(nav|ul)[^>]*data-testid=["']test-user-social-links["']/i)) {
      technicalAudit.semanticHtml = false;
      technicalAudit.errors.push('Social links should be inside <nav> or <ul>.');
    }

    // Check social link attributes
    if (found.includes('test-user-social-links')) {
      // Basic check for target="_blank" and rel
      const linksText = result.text.split('test-user-social-links')[1]?.split('</')[0] || '';
      if (linksText.includes('<a') && (!linksText.includes('target="_blank"') || !linksText.includes('rel="noopener'))) {
         technicalAudit.accessibility = false;
         technicalAudit.errors.push('Social links must have target="_blank" and rel="noopener noreferrer".');
      }
    }

    // Check list structure for hobbies/dislikes
    if ((found.includes('test-user-hobbies') || found.includes('test-user-dislikes')) && !result.text.includes('<li>')) {
       technicalAudit.semanticHtml = false;
       technicalAudit.errors.push('Hobbies and Dislikes must be presented as a list (<ul>/<li>).');
    }

    // Check for alt text on avatar
    if (found.includes('test-user-avatar')) {
      const avatarMatch = result.text.match(/<img[^>]*data-testid=["']test-user-avatar["'][^>]*alt=["']([^"']+)["']/i);
      if (!avatarMatch || !avatarMatch[1] || ['image', 'avatar', 'photo', 'img'].includes(avatarMatch[1].toLowerCase().trim())) {
        technicalAudit.accessibility = false;
        technicalAudit.errors.push('Avatar image missing meaningful alt text (avoid "image", "photo", etc).');
      }
    }
  }

  return {
    success: missing.length === 0 && technicalAudit.errors.length === 0,
    status: result.status,
    found,
    missing,
    extractedName,
    technicalAudit,
    message: missing.length === 0 && technicalAudit.errors.length === 0 
      ? 'All requirements and technical audits passed.' 
      : `${missing.length} IDs missing or technical requirements failed.`
  };
}

async function inspectRepo(repoUrl, requiredTestIds) {
  const normalized = normalizeUrl(repoUrl);
  if (!normalized) {
    return { success: false, message: 'Invalid repository URL', repoInfo: null, sourceAnalysis: null };
  }

  const repo = parseGitHubRepo(normalized);
  if (!repo) {
    return { success: false, message: 'Only GitHub repository URLs are supported currently', repoInfo: null, sourceAnalysis: null };
  }

  const apiRepoUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}`;
  const repoCheck = await fetchGitHubJson(apiRepoUrl);
  if (!repoCheck.ok) {
    return { success: false, message: `GitHub repo check failed: ${repoCheck.body.message || repoCheck.status}`, repoInfo: null, sourceAnalysis: null };
  }

  const apiReadmeUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/readme`;
  const readmeCheck = await fetchGitHubJson(apiReadmeUrl);
  const readmeText = readmeCheck.ok && readmeCheck.body.content
    ? Buffer.from(readmeCheck.body.content, 'base64').toString('utf8')
    : null;

  const defaultBranch = repoCheck.body.default_branch || 'main';
  const sourceAnalysis = await analyzeRepoSources(repo.owner, repo.repo, defaultBranch, requiredTestIds);

  return {
    success: true,
    message: 'GitHub repository is accessible.',
    repoInfo: {
      owner: repo.owner,
      repo: repo.repo,
      description: repoCheck.body.description || '',
      readmeText,
      defaultBranch
    },
    sourceAnalysis
  };
}

app.post('/api/report', async (req, res) => {
  const { task1a = {}, task1b = {} } = req.body || {};

  const [taskA, taskB] = await Promise.all([
    Promise.all([inspectLivePage(task1a.liveUrl, TASK1A_TESTIDS), inspectRepo(task1a.repoUrl, TASK1A_TESTIDS)]),
    Promise.all([inspectLivePage(task1b.liveUrl, TASK1B_TESTIDS), inspectRepo(task1b.repoUrl, TASK1B_TESTIDS)])
  ]);

  const report = {
    generatedAt: new Date().toISOString(),
    task1a: {
      live: taskA[0],
      repo: taskA[1]
    },
    task1b: {
      live: taskB[0],
      repo: taskB[1]
    }
  };

  res.json(report);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Grading platform listening on http://localhost:${port}`);
});
