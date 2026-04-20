const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const TASK1A_TESTIDS = [
  'test-todo-edit-form',
  'test-todo-edit-title-input',
  'test-todo-edit-description-input',
  'test-todo-edit-priority-select',
  'test-todo-edit-due-date-input',
  'test-todo-save-button',
  'test-todo-cancel-button',
  'test-todo-status-control',
  'test-todo-priority-indicator',
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
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'grading-platform' }
    });
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
    return { success: false, message: 'Invalid live URL', found: [] };
  }

  const result = await fetchHtml(normalized);
  if (!result.ok) {
    return { success: false, message: `Live site unreachable (status ${result.status})`, found: [] };
  }

  const found = requiredTestIds.filter((id) => result.text.includes(id));
  const missing = requiredTestIds.filter((id) => !found.includes(id));

  // Extract name if test-user-name is present (specifically for Task 1B)
  let extractedName = null;
  if (found.includes('test-user-name')) {
    // Basic regex to find text content inside an element with data-testid="test-user-name"
    // Handles both <element data-testid="test-user-name">Name</element> 
    // and <element data-testid='test-user-name'>Name</element>
    const nameMatch = result.text.match(/data-testid=["']test-user-name["'][^>]*>([^<]+)</i);
    if (nameMatch && nameMatch[1]) {
      extractedName = nameMatch[1].trim();
    }
  }

  return {
    success: missing.length === 0,
    status: result.status,
    found,
    missing,
    extractedName,
    message: missing.length === 0 ? 'All required test IDs found in live HTML.' : `${missing.length} required test IDs missing.`
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
