'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const actionRoot = __dirname;
const repoRoot = path.resolve(actionRoot, '../../..');
const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
const script = path.join(repoRoot, 'scripts', 'pr-review.js');
const commentFile = path.join(workspace, 'buy-vs-build-comment.md');

async function githubRequest(method, apiPath, body) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required to post the PR comment.');
  const res = await fetch(`https://api.github.com${apiPath}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'buy-vs-build-dependency-review'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${method} ${apiPath} failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

function pullRequestNumber() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return null;
  const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  return event.pull_request && event.pull_request.number;
}

async function upsertComment() {
  if (!fs.existsSync(commentFile)) return;
  const repo = process.env.GITHUB_REPOSITORY;
  const issue = pullRequestNumber();
  if (!repo || !issue) return;
  const [owner, name] = repo.split('/');
  const marker = '<!-- buy-vs-build-review -->';
  const body = fs.readFileSync(commentFile, 'utf8');
  const comments = await githubRequest('GET', `/repos/${owner}/${name}/issues/${issue}/comments`);
  const existing = comments.find(comment => comment.body && comment.body.includes(marker));
  if (existing) {
    await githubRequest('PATCH', `/repos/${owner}/${name}/issues/comments/${existing.id}`, { body });
  } else {
    await githubRequest('POST', `/repos/${owner}/${name}/issues/${issue}/comments`, { body });
  }
}

async function main() {
  const completed = spawnSync(process.execPath, [script], {
    cwd: workspace,
    env: process.env,
    encoding: 'utf8',
    stdio: 'inherit'
  });
  if (completed.error) {
    console.error(completed.error.message);
  }
  try {
    await upsertComment();
  } catch (error) {
    console.error(error.message);
    if (completed.status === 0) process.exitCode = 1;
  }
  if (completed.error || completed.status !== 0) process.exitCode = completed.status || 1;
}

main();
