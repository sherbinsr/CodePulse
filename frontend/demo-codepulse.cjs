'use strict';
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const VIDEO_DIR = path.join(__dirname, 'screenshots');
const OUTPUT_NAME = 'codepulse-demo.webm';
const REHEARSAL = process.argv.includes('--rehearse');

// ── Dummy Data ────────────────────────────────────────────────────────────────

const MOCK_USER = { login: 'alex-dev', name: 'Alex Johnson', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4' };
const MOCK_ORG = 'acme-corp';

const MOCK_ORGS = [
  { login: 'acme-corp', avatar_url: 'https://avatars.githubusercontent.com/u/2?v=4', description: 'Acme Corporation Engineering' }
];

const MOCK_SYNC_STATUS = { status: 'done', prs_synced: 1247, repos_synced: 12, error: null };

const MOCK_OVERVIEW = {
  total_repos: 12, total_prs: 1247, merged_prs: 984, open_prs: 178, closed_prs: 85,
  merge_rate: 78.9, avg_merge_time_hours: 18.4, avg_review_time_hours: 6.2,
  total_reviews: 3891, unique_contributors: 24
};

const MOCK_DEVELOPERS = [
  { login: 'sarah-chen', avatar_url: null, total_prs: 187, merged_prs: 156, open_prs: 22, merge_rate: 83.4, avg_merge_hours: 14.2, total_additions: 48200, total_deletions: 31100, reviews_given: 412, approvals: 380, change_requests: 32 },
  { login: 'james-wilson', avatar_url: null, total_prs: 162, merged_prs: 131, open_prs: 19, merge_rate: 80.9, avg_merge_hours: 16.8, total_additions: 39800, total_deletions: 28400, reviews_given: 356, approvals: 318, change_requests: 38 },
  { login: 'priya-patel', avatar_url: null, total_prs: 145, merged_prs: 118, open_prs: 17, merge_rate: 81.4, avg_merge_hours: 12.6, total_additions: 35600, total_deletions: 24200, reviews_given: 298, approvals: 271, change_requests: 27 },
  { login: 'tom-nguyen', avatar_url: null, total_prs: 134, merged_prs: 107, open_prs: 21, merge_rate: 79.9, avg_merge_hours: 19.4, total_additions: 31200, total_deletions: 19800, reviews_given: 247, approvals: 219, change_requests: 28 },
  { login: 'emily-ross', avatar_url: null, total_prs: 121, merged_prs: 96, open_prs: 18, merge_rate: 79.3, avg_merge_hours: 21.1, total_additions: 28900, total_deletions: 18600, reviews_given: 213, approvals: 192, change_requests: 21 },
  { login: 'carlos-diaz', avatar_url: null, total_prs: 108, merged_prs: 84, open_prs: 16, merge_rate: 77.8, avg_merge_hours: 24.3, total_additions: 25400, total_deletions: 16200, reviews_given: 178, approvals: 158, change_requests: 20 },
  { login: 'lisa-kim', avatar_url: null, total_prs: 96, merged_prs: 74, open_prs: 14, merge_rate: 77.1, avg_merge_hours: 22.8, total_additions: 22100, total_deletions: 14800, reviews_given: 154, approvals: 138, change_requests: 16 },
  { login: 'mike-obi', avatar_url: null, total_prs: 84, merged_prs: 63, open_prs: 13, merge_rate: 75.0, avg_merge_hours: 28.6, total_additions: 18600, total_deletions: 12400, reviews_given: 132, approvals: 114, change_requests: 18 },
];

const MOCK_REPOS = [
  { repo: 'acme-corp/api-gateway',    name: 'api-gateway',    total_prs: 312, merged_prs: 264, open_prs: 34, merge_rate: 84.6, avg_merge_hours: 14.2, avg_review_hours: 5.1, contributors: 14 },
  { repo: 'acme-corp/web-dashboard',  name: 'web-dashboard',  total_prs: 287, merged_prs: 228, open_prs: 42, merge_rate: 79.4, avg_merge_hours: 16.8, avg_review_hours: 6.3, contributors: 12 },
  { repo: 'acme-corp/mobile-app',     name: 'mobile-app',     total_prs: 198, merged_prs: 151, open_prs: 31, merge_rate: 76.3, avg_merge_hours: 19.6, avg_review_hours: 7.8, contributors: 9  },
  { repo: 'acme-corp/auth-service',   name: 'auth-service',   total_prs: 164, merged_prs: 138, open_prs: 18, merge_rate: 84.1, avg_merge_hours: 11.4, avg_review_hours: 4.2, contributors: 8  },
  { repo: 'acme-corp/data-pipeline',  name: 'data-pipeline',  total_prs: 143, merged_prs: 109, open_prs: 24, merge_rate: 76.2, avg_merge_hours: 22.3, avg_review_hours: 8.9, contributors: 7  },
  { repo: 'acme-corp/notifications',  name: 'notifications',  total_prs: 112, merged_prs: 86,  open_prs: 18, merge_rate: 76.8, avg_merge_hours: 20.1, avg_review_hours: 7.4, contributors: 6  },
  { repo: 'acme-corp/search-indexer', name: 'search-indexer', total_prs: 98,  merged_prs: 73,  open_prs: 16, merge_rate: 74.5, avg_merge_hours: 25.8, avg_review_hours: 9.2, contributors: 5  },
  { repo: 'acme-corp/billing',        name: 'billing',        total_prs: 87,  merged_prs: 69,  open_prs: 12, merge_rate: 79.3, avg_merge_hours: 17.6, avg_review_hours: 6.8, contributors: 5  },
];

const MOCK_TRENDS = [
  { month: '2024-11', total_prs: 168, merged_prs: 131, contributors: 18 },
  { month: '2024-12', total_prs: 142, merged_prs: 109, contributors: 16 },
  { month: '2025-01', total_prs: 185, merged_prs: 148, contributors: 20 },
  { month: '2025-02', total_prs: 201, merged_prs: 161, contributors: 22 },
  { month: '2025-03', total_prs: 218, merged_prs: 174, contributors: 23 },
  { month: '2025-04', total_prs: 233, merged_prs: 187, contributors: 24 },
];

const MOCK_REVIEW_NETWORK = [
  { pr_author: 'sarah-chen',  reviewer: 'james-wilson', review_count: 48 },
  { pr_author: 'sarah-chen',  reviewer: 'priya-patel',  review_count: 31 },
  { pr_author: 'sarah-chen',  reviewer: 'tom-nguyen',   review_count: 22 },
  { pr_author: 'james-wilson', reviewer: 'sarah-chen',  review_count: 41 },
  { pr_author: 'james-wilson', reviewer: 'emily-ross',  review_count: 27 },
  { pr_author: 'james-wilson', reviewer: 'carlos-diaz', review_count: 18 },
  { pr_author: 'priya-patel',  reviewer: 'sarah-chen',  review_count: 36 },
  { pr_author: 'priya-patel',  reviewer: 'james-wilson', review_count: 29 },
  { pr_author: 'priya-patel',  reviewer: 'mike-obi',    review_count: 14 },
  { pr_author: 'tom-nguyen',   reviewer: 'priya-patel',  review_count: 33 },
  { pr_author: 'tom-nguyen',   reviewer: 'sarah-chen',  review_count: 24 },
  { pr_author: 'tom-nguyen',   reviewer: 'lisa-kim',    review_count: 11 },
  { pr_author: 'emily-ross',   reviewer: 'tom-nguyen',  review_count: 28 },
  { pr_author: 'emily-ross',   reviewer: 'james-wilson', review_count: 19 },
  { pr_author: 'carlos-diaz',  reviewer: 'emily-ross',  review_count: 22 },
  { pr_author: 'carlos-diaz',  reviewer: 'priya-patel', review_count: 17 },
  { pr_author: 'lisa-kim',     reviewer: 'carlos-diaz', review_count: 20 },
  { pr_author: 'lisa-kim',     reviewer: 'sarah-chen',  review_count: 15 },
  { pr_author: 'mike-obi',     reviewer: 'lisa-kim',    review_count: 18 },
  { pr_author: 'mike-obi',     reviewer: 'tom-nguyen',  review_count: 12 },
];

const MOCK_PRS = {
  data: [
    { id: 1,  number: 2341, repo: 'acme-corp/api-gateway',   title: 'feat: add rate limiting middleware for API endpoints',    state: 'MERGED', author: 'sarah-chen',  author_avatar: null, additions: 312, deletions: 48,  changed_files: 8,  reviews_count: 3, time_to_merge_hours: 11.2, time_to_first_review_hours: 3.1, created_at: '2025-04-28T09:12:00', merged_at: '2025-04-28T20:19:00', closed_at: null },
    { id: 2,  number: 2338, repo: 'acme-corp/web-dashboard',  title: 'feat: add dark mode support across all dashboard views',   state: 'MERGED', author: 'james-wilson', author_avatar: null, additions: 891, deletions: 204, changed_files: 24, reviews_count: 4, time_to_merge_hours: 18.7, time_to_first_review_hours: 5.4, created_at: '2025-04-26T14:30:00', merged_at: '2025-04-27T09:11:00', closed_at: null },
    { id: 3,  number: 2336, repo: 'acme-corp/auth-service',   title: 'fix: resolve token expiry race condition on refresh',       state: 'MERGED', author: 'priya-patel',  author_avatar: null, additions: 87,  deletions: 34,  changed_files: 4,  reviews_count: 2, time_to_merge_hours: 8.4,  time_to_first_review_hours: 2.1, created_at: '2025-04-25T11:00:00', merged_at: '2025-04-25T19:24:00', closed_at: null },
    { id: 4,  number: 2334, repo: 'acme-corp/mobile-app',     title: 'feat: implement push notification deep linking',            state: 'OPEN',   author: 'tom-nguyen',   author_avatar: null, additions: 456, deletions: 89,  changed_files: 12, reviews_count: 1, time_to_merge_hours: null, time_to_first_review_hours: 7.8, created_at: '2025-04-24T16:45:00', merged_at: null, closed_at: null },
    { id: 5,  number: 2332, repo: 'acme-corp/data-pipeline',  title: 'perf: optimise Kafka consumer batch processing',            state: 'MERGED', author: 'emily-ross',   author_avatar: null, additions: 234, deletions: 112, changed_files: 7,  reviews_count: 3, time_to_merge_hours: 22.1, time_to_first_review_hours: 8.3, created_at: '2025-04-23T10:15:00', merged_at: '2025-04-24T08:21:00', closed_at: null },
    { id: 6,  number: 2329, repo: 'acme-corp/api-gateway',    title: 'chore: upgrade dependencies to patch security advisories',  state: 'MERGED', author: 'carlos-diaz',  author_avatar: null, additions: 142, deletions: 138, changed_files: 3,  reviews_count: 2, time_to_merge_hours: 14.6, time_to_first_review_hours: 4.7, created_at: '2025-04-22T08:30:00', merged_at: '2025-04-22T23:06:00', closed_at: null },
    { id: 7,  number: 2327, repo: 'acme-corp/web-dashboard',  title: 'feat: add CSV and PDF export to digest page',               state: 'MERGED', author: 'lisa-kim',     author_avatar: null, additions: 678, deletions: 23,  changed_files: 11, reviews_count: 3, time_to_merge_hours: 16.3, time_to_first_review_hours: 5.9, created_at: '2025-04-21T13:20:00', merged_at: '2025-04-22T05:38:00', closed_at: null },
    { id: 8,  number: 2325, repo: 'acme-corp/billing',        title: 'fix: correct prorated billing calculation for mid-cycle',   state: 'OPEN',   author: 'mike-obi',     author_avatar: null, additions: 198, deletions: 67,  changed_files: 6,  reviews_count: 2, time_to_merge_hours: null, time_to_first_review_hours: 11.2, created_at: '2025-04-20T15:00:00', merged_at: null, closed_at: null },
    { id: 9,  number: 2322, repo: 'acme-corp/notifications',  title: 'feat: template engine for email notification content',      state: 'MERGED', author: 'sarah-chen',  author_avatar: null, additions: 521, deletions: 88,  changed_files: 14, reviews_count: 4, time_to_merge_hours: 19.8, time_to_first_review_hours: 6.4, created_at: '2025-04-19T09:45:00', merged_at: '2025-04-20T05:33:00', closed_at: null },
    { id: 10, number: 2319, repo: 'acme-corp/search-indexer', title: 'perf: add Elasticsearch index sharding for large datasets', state: 'CLOSED', author: 'james-wilson', author_avatar: null, additions: 389, deletions: 156, changed_files: 9,  reviews_count: 3, time_to_merge_hours: null, time_to_first_review_hours: 9.1, created_at: '2025-04-18T11:30:00', merged_at: null, closed_at: '2025-04-20T14:22:00' },
  ],
  total: 1247
};

const MOCK_CI_SUMMARY = [
  { repo: 'acme-corp/api-gateway',    name: 'api-gateway',    total_runs: 642, successful_runs: 578, failed_runs: 64,  first_try_pass_rate: 88.2, overall_pass_rate: 90.0, avg_duration_seconds: 142 },
  { repo: 'acme-corp/web-dashboard',  name: 'web-dashboard',  total_runs: 581, successful_runs: 493, failed_runs: 88,  first_try_pass_rate: 82.1, overall_pass_rate: 84.9, avg_duration_seconds: 218 },
  { repo: 'acme-corp/auth-service',   name: 'auth-service',   total_runs: 428, successful_runs: 401, failed_runs: 27,  first_try_pass_rate: 92.8, overall_pass_rate: 93.7, avg_duration_seconds: 98  },
  { repo: 'acme-corp/mobile-app',     name: 'mobile-app',     total_runs: 394, successful_runs: 321, failed_runs: 73,  first_try_pass_rate: 78.4, overall_pass_rate: 81.5, avg_duration_seconds: 284 },
  { repo: 'acme-corp/data-pipeline',  name: 'data-pipeline',  total_runs: 312, successful_runs: 261, failed_runs: 51,  first_try_pass_rate: 79.5, overall_pass_rate: 83.7, avg_duration_seconds: 376 },
  { repo: 'acme-corp/billing',        name: 'billing',        total_runs: 287, successful_runs: 251, failed_runs: 36,  first_try_pass_rate: 84.3, overall_pass_rate: 87.5, avg_duration_seconds: 164 },
];

const MOCK_BUILD_TRENDS = [
  { week: '2025-03-10', repo_name: 'api-gateway',   avg_duration_seconds: 164, run_count: 28 },
  { week: '2025-03-17', repo_name: 'api-gateway',   avg_duration_seconds: 151, run_count: 31 },
  { week: '2025-03-24', repo_name: 'api-gateway',   avg_duration_seconds: 148, run_count: 34 },
  { week: '2025-03-31', repo_name: 'api-gateway',   avg_duration_seconds: 143, run_count: 36 },
  { week: '2025-04-07', repo_name: 'api-gateway',   avg_duration_seconds: 139, run_count: 38 },
  { week: '2025-04-14', repo_name: 'api-gateway',   avg_duration_seconds: 142, run_count: 40 },
  { week: '2025-04-21', repo_name: 'api-gateway',   avg_duration_seconds: 136, run_count: 42 },
  { week: '2025-04-28', repo_name: 'api-gateway',   avg_duration_seconds: 134, run_count: 44 },
  { week: '2025-03-10', repo_name: 'web-dashboard', avg_duration_seconds: 251, run_count: 24 },
  { week: '2025-03-17', repo_name: 'web-dashboard', avg_duration_seconds: 238, run_count: 27 },
  { week: '2025-03-24', repo_name: 'web-dashboard', avg_duration_seconds: 229, run_count: 29 },
  { week: '2025-03-31', repo_name: 'web-dashboard', avg_duration_seconds: 221, run_count: 31 },
  { week: '2025-04-07', repo_name: 'web-dashboard', avg_duration_seconds: 218, run_count: 33 },
  { week: '2025-04-14', repo_name: 'web-dashboard', avg_duration_seconds: 214, run_count: 35 },
  { week: '2025-04-21', repo_name: 'web-dashboard', avg_duration_seconds: 208, run_count: 36 },
  { week: '2025-04-28', repo_name: 'web-dashboard', avg_duration_seconds: 204, run_count: 38 },
];

const MOCK_FLAKY = [
  { workflow_name: 'integration-tests', repo_name: 'mobile-app',     flaky_count: 41, total_runs: 394, flakiness_rate: 24.8 },
  { workflow_name: 'e2e-cypress',       repo_name: 'web-dashboard',  flaky_count: 38, total_runs: 581, flakiness_rate: 16.3 },
  { workflow_name: 'load-tests',        repo_name: 'data-pipeline',  flaky_count: 29, total_runs: 312, flakiness_rate: 14.1 },
  { workflow_name: 'unit-tests',        repo_name: 'billing',        flaky_count: 18, total_runs: 287, flakiness_rate: 8.7  },
  { workflow_name: 'smoke-tests',       repo_name: 'auth-service',   flaky_count: 11, total_runs: 428, flakiness_rate: 5.2  },
];

const MOCK_COMMIT_ACTIVITY = [
  { author_login: 'sarah-chen',  author_avatar: null, total_commits: 412, active_days: 68, commits_per_active_day: 6.1, after_hours_commits: 124, weekend_commits: 48, after_hours_pct: 30.1, weekend_pct: 11.7, repos_contributed: 7 },
  { author_login: 'james-wilson', author_avatar: null, total_commits: 378, active_days: 62, commits_per_active_day: 6.1, after_hours_commits: 89,  weekend_commits: 34, after_hours_pct: 23.5, weekend_pct: 9.0,  repos_contributed: 6 },
  { author_login: 'priya-patel',  author_avatar: null, total_commits: 341, active_days: 71, commits_per_active_day: 4.8, after_hours_commits: 61,  weekend_commits: 22, after_hours_pct: 17.9, weekend_pct: 6.5,  repos_contributed: 5 },
  { author_login: 'tom-nguyen',   author_avatar: null, total_commits: 298, active_days: 58, commits_per_active_day: 5.1, after_hours_commits: 112, weekend_commits: 67, after_hours_pct: 37.6, weekend_pct: 22.5, repos_contributed: 5 },
  { author_login: 'emily-ross',   author_avatar: null, total_commits: 271, active_days: 54, commits_per_active_day: 5.0, after_hours_commits: 48,  weekend_commits: 19, after_hours_pct: 17.7, weekend_pct: 7.0,  repos_contributed: 4 },
  { author_login: 'carlos-diaz',  author_avatar: null, total_commits: 234, active_days: 49, commits_per_active_day: 4.8, after_hours_commits: 38,  weekend_commits: 14, after_hours_pct: 16.2, weekend_pct: 6.0,  repos_contributed: 4 },
  { author_login: 'lisa-kim',     author_avatar: null, total_commits: 198, active_days: 44, commits_per_active_day: 4.5, after_hours_commits: 31,  weekend_commits: 11, after_hours_pct: 15.7, weekend_pct: 5.6,  repos_contributed: 4 },
  { author_login: 'mike-obi',     author_avatar: null, total_commits: 167, active_days: 38, commits_per_active_day: 4.4, after_hours_commits: 82,  weekend_commits: 51, after_hours_pct: 49.1, weekend_pct: 30.5, repos_contributed: 3 },
];

const MOCK_CODE_CHURN = [
  ...['2025-03-10','2025-03-17','2025-03-24','2025-03-31','2025-04-07','2025-04-14','2025-04-21','2025-04-28'].flatMap((week, i) => [
    { week, repo_name: 'api-gateway',   total_commits: 28 + i * 2, unique_authors: 9  },
    { week, repo_name: 'web-dashboard', total_commits: 24 + i * 2, unique_authors: 8  },
    { week, repo_name: 'mobile-app',    total_commits: 19 + i,     unique_authors: 6  },
    { week, repo_name: 'auth-service',  total_commits: 16 + i,     unique_authors: 5  },
    { week, repo_name: 'data-pipeline', total_commits: 12 + i,     unique_authors: 4  },
  ])
];

const MOCK_DIGEST = {
  org: 'acme-corp',
  period_label: 'Last 1 Month',
  since: '2025-03-28T00:00:00',
  until: '2025-04-28T00:00:00',
  total_prs: 233,
  merged_prs: 187,
  open_prs: 31,
  merge_rate: 80.3,
  avg_merge_hours: 16.8,
  avg_review_hours: 5.9,
  unique_contributors: 24,
  total_reviews: 712,
  top_contributors: [
    { login: 'sarah-chen',  avatar_url: null, total_prs: 48, merged_prs: 41, reviews_given: 112 },
    { login: 'james-wilson', avatar_url: null, total_prs: 42, merged_prs: 35, reviews_given: 98  },
    { login: 'priya-patel',  avatar_url: null, total_prs: 37, merged_prs: 31, reviews_given: 84  },
    { login: 'tom-nguyen',   avatar_url: null, total_prs: 33, merged_prs: 27, reviews_given: 71  },
    { login: 'emily-ross',   avatar_url: null, total_prs: 28, merged_prs: 23, reviews_given: 63  },
  ],
  top_repos: [
    { name: 'api-gateway',   total_prs: 68, merged_prs: 58, merge_rate: 85.3 },
    { name: 'web-dashboard', total_prs: 61, merged_prs: 49, merge_rate: 80.3 },
    { name: 'mobile-app',    total_prs: 44, merged_prs: 34, merge_rate: 77.3 },
    { name: 'auth-service',  total_prs: 38, merged_prs: 33, merge_rate: 86.8 },
    { name: 'data-pipeline', total_prs: 22, merged_prs: 13, merge_rate: 59.1 },
  ]
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function injectCursor(page) {
  await page.evaluate(() => {
    const existing = document.getElementById('demo-cursor');
    if (existing) existing.remove();
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
    cursor.style.cssText = `
      position: fixed; z-index: 999999; pointer-events: none;
      width: 24px; height: 24px;
      transition: left 0.08s, top 0.08s;
      filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
    `;
    cursor.style.left = '640px';
    cursor.style.top = '360px';
    document.body.appendChild(cursor);
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });
  });
}

async function injectSubtitleBar(page) {
  await page.evaluate(() => {
    const existing = document.getElementById('demo-subtitle');
    if (existing) existing.remove();
    const bar = document.createElement('div');
    bar.id = 'demo-subtitle';
    bar.style.cssText = `
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 999998;
      text-align: center; padding: 10px 24px;
      background: rgba(0,0,0,0.78);
      color: white; font-family: -apple-system, "Segoe UI", sans-serif;
      font-size: 15px; font-weight: 500; letter-spacing: 0.3px;
      transition: opacity 0.3s; pointer-events: none;
    `;
    bar.textContent = '';
    bar.style.opacity = '0';
    document.body.appendChild(bar);
  });
}

async function showSubtitle(page, text) {
  await page.evaluate((t) => {
    const bar = document.getElementById('demo-subtitle');
    if (!bar) return;
    bar.textContent = t || '';
    bar.style.opacity = t ? '1' : '0';
  }, text);
  if (text) await page.waitForTimeout(700);
}

async function moveAndClick(page, locator, label, opts = {}) {
  const { postClickDelay = 900, ...clickOpts } = opts;
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const visible = await el.isVisible().catch(() => false);
  if (!visible) {
    console.error(`WARNING: moveAndClick skipped - "${label}" not visible`);
    return false;
  }
  try {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    const box = await el.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
      await page.waitForTimeout(350);
    }
    await el.click(clickOpts);
  } catch (e) {
    console.error(`WARNING: moveAndClick failed on "${label}": ${e.message}`);
    return false;
  }
  await page.waitForTimeout(postClickDelay);
  return true;
}

async function typeSlowly(page, locator, text, label, charDelay = 40) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  await moveAndClick(page, el, label);
  await el.fill('');
  await el.pressSequentially(text, { delay: charDelay });
  await page.waitForTimeout(500);
}

async function ensureVisible(page, locator, label) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const visible = await el.isVisible().catch(() => false);
  if (!visible) {
    console.error(`REHEARSAL FAIL: "${label}"`);
    return false;
  }
  console.log(`REHEARSAL OK: "${label}"`);
  return true;
}

async function panElements(page, selector, maxCount = 6) {
  const elements = await page.locator(selector).all();
  for (let i = 0; i < Math.min(elements.length, maxCount); i++) {
    try {
      const box = await elements[i].boundingBox();
      if (box && box.y < 680) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
        await page.waitForTimeout(500);
      }
    } catch (e) {}
  }
}

// ── Route Mocking ─────────────────────────────────────────────────────────────

async function setupMocks(context) {
  await context.route('**/api/orgs', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ORGS) });
  });
  await context.route('**/api/orgs/*/sync/status', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SYNC_STATUS) });
  });
  await context.route('**/api/orgs/*/sync', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ job_id: 1, status: 'running', message: 'Sync started' }) });
  });
  await context.route('**/api/analytics/*/overview', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_OVERVIEW) });
  });
  await context.route('**/api/analytics/*/developers', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DEVELOPERS) });
  });
  await context.route('**/api/analytics/*/repositories', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_REPOS) });
  });
  await context.route('**/api/analytics/*/trends*', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TRENDS) });
  });
  await context.route('**/api/analytics/*/review-network', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_REVIEW_NETWORK) });
  });
  await context.route('**/api/analytics/*/prs*', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PRS) });
  });
  await context.route('**/api/analytics/*/ci-summary', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CI_SUMMARY) });
  });
  await context.route('**/api/analytics/*/ci-trends', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BUILD_TRENDS) });
  });
  await context.route('**/api/analytics/*/ci-flaky', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_FLAKY) });
  });
  await context.route('**/api/analytics/*/commit-activity', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_COMMIT_ACTIVITY) });
  });
  await context.route('**/api/analytics/*/commit-churn', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CODE_CHURN) });
  });
  await context.route('**/api/analytics/*/digest*', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DIGEST) });
  });
}

async function injectAuth(page) {
  await page.evaluate(([user]) => {
    localStorage.setItem('token', 'demo-token-abc123');
    localStorage.setItem('user', JSON.stringify(user));
  }, [MOCK_USER]);
}

async function navTo(page, path) {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForTimeout(1200);
  await injectCursor(page);
  await injectSubtitleBar(page);
}

// ── Rehearsal ─────────────────────────────────────────────────────────────────

async function rehearse(browser) {
  console.log('\n=== PHASE 2: REHEARSAL ===\n');
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await setupMocks(context);
  const page = await context.newPage();

  await page.goto(BASE_URL);
  await injectAuth(page);

  await page.goto(`${BASE_URL}/dashboard?org=${MOCK_ORG}`);
  await page.waitForTimeout(2000);

  let allOk = true;
  const checks = [
    ['Overview heading', 'h1:has-text("Overview")'],
    ['Stat cards', '[class*="rounded-2xl"]'],
    ['Repositories link', 'a[href*="/repositories"]'],
    ['Developers link', 'a[href*="/developers"]'],
    ['Reviews link', 'a[href*="/reviews"]'],
    ['PR Insights link', 'a[href*="/pr-insights"]'],
    ['CI Insights link', 'a[href*="/ci-insights"]'],
    ['Commit Activity link', 'a[href*="/commit-activity"]'],
    ['Digest link', 'a[href*="/digest"]'],
    ['Sign out button', 'button:has-text("Sign out")'],
  ];

  for (const [label, selector] of checks) {
    if (!await ensureVisible(page, selector, label)) allOk = false;
  }

  // Check each page loads
  for (const [pageName, url] of [
    ['Repositories', `/dashboard/repositories?org=${MOCK_ORG}`],
    ['Developers', `/dashboard/developers?org=${MOCK_ORG}`],
    ['Reviews', `/dashboard/reviews?org=${MOCK_ORG}`],
    ['PR Insights', `/dashboard/pr-insights?org=${MOCK_ORG}`],
    ['CI Insights', `/dashboard/ci-insights?org=${MOCK_ORG}`],
    ['Commit Activity', `/dashboard/commit-activity?org=${MOCK_ORG}`],
    ['Digest', `/dashboard/digest?org=${MOCK_ORG}`],
  ]) {
    await page.goto(`${BASE_URL}${url}`);
    await page.waitForTimeout(1500);
    const header = await page.locator('h1').first().isVisible().catch(() => false);
    console.log(`REHEARSAL ${header ? 'OK' : 'FAIL'}: ${pageName} page loads`);
    if (!header) allOk = false;
  }

  await browser.close();
  if (!allOk) {
    console.error('\nREHEARSAL FAILED — fix selectors before recording.');
    process.exit(1);
  }
  console.log('\nREHEARSAL PASSED — all checks OK.\n');
}

// ── Record ────────────────────────────────────────────────────────────────────

async function record(browser) {
  console.log('\n=== PHASE 3: RECORDING ===\n');

  if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });

  const context = await browser.newContext({
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
  });
  await setupMocks(context);
  const page = await context.newPage();

  try {
    // ── Step 1: Landing page ───────────────────────────────────────────────
    await page.goto(BASE_URL);
    await page.waitForTimeout(800);
    await injectCursor(page);
    await injectSubtitleBar(page);
    await showSubtitle(page, 'CodePulse — Engineering Analytics Platform');
    await page.waitForTimeout(1800);

    // Pan the landing page headings
    const heroText = page.locator('h1').first();
    const box = await heroText.boundingBox().catch(() => null);
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    await page.waitForTimeout(1200);

    // Feature pills
    await panElements(page, '[class*="rounded-full"]', 4);
    await page.waitForTimeout(600);

    await showSubtitle(page, 'Step 1 — Connecting GitHub to sign in');
    const connectBtn = page.locator('button:has-text("Connect GitHub")').first();
    const btnBox = await connectBtn.boundingBox().catch(() => null);
    if (btnBox) await page.mouse.move(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2, { steps: 14 });
    await page.waitForTimeout(1000);

    // Inject auth and go straight to dashboard (simulating successful OAuth)
    await injectAuth(page);
    await page.goto(`${BASE_URL}/dashboard?org=${MOCK_ORG}`);
    await page.waitForTimeout(2000);
    await injectCursor(page);
    await injectSubtitleBar(page);

    // ── Step 2: Overview dashboard ─────────────────────────────────────────
    await showSubtitle(page, 'Step 2 — Overview: org-wide metrics at a glance');
    await page.waitForTimeout(2000);

    // Pan stat cards
    await panElements(page, '[class*="rounded-2xl"]', 8);
    await page.waitForTimeout(800);

    // Scroll down to charts
    await page.evaluate(() => window.scrollTo({ top: 420, behavior: 'smooth' }));
    await page.waitForTimeout(1500);
    await panElements(page, 'svg', 3);
    await page.waitForTimeout(1200);

    // Scroll back up
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(800);

    // ── Step 3: Repositories ───────────────────────────────────────────────
    await showSubtitle(page, 'Step 3 — Repositories: PR volume and merge rates');
    await moveAndClick(page, `a[href*="/repositories"]`, 'Repositories nav', { postClickDelay: 2000 });
    await injectCursor(page);
    await injectSubtitleBar(page);
    await showSubtitle(page, 'Step 3 — Repositories: PR volume and merge rates');

    // Pan chart
    await panElements(page, '[class*="recharts"]', 2);
    await page.waitForTimeout(800);

    // Scroll to table
    await page.evaluate(() => window.scrollTo({ top: 380, behavior: 'smooth' }));
    await page.waitForTimeout(1200);
    await panElements(page, 'tr', 5);
    await page.waitForTimeout(800);

    // Search for a repo
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    const searchVisible = await searchInput.isVisible().catch(() => false);
    if (searchVisible) {
      await typeSlowly(page, searchInput, 'api', 'search repos');
      await page.waitForTimeout(1000);
      await searchInput.fill('');
      await page.waitForTimeout(600);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(600);

    // ── Step 4: Developers ─────────────────────────────────────────────────
    await showSubtitle(page, 'Step 4 — Developers: individual contributor stats');
    await moveAndClick(page, `a[href*="/developers"]`, 'Developers nav', { postClickDelay: 2000 });
    await injectCursor(page);
    await injectSubtitleBar(page);
    await showSubtitle(page, 'Step 4 — Developers: individual contributor stats');

    await panElements(page, 'tr', 5);
    await page.waitForTimeout(700);

    // Click a developer to show radar
    const devRow = page.locator('tbody tr').nth(1);
    const devVisible = await devRow.isVisible().catch(() => false);
    if (devVisible) await moveAndClick(page, devRow, 'developer row', { postClickDelay: 1000 });
    await panElements(page, '[class*="recharts"]', 2);
    await page.waitForTimeout(1200);

    // ── Step 5: Reviews + Heatmap ──────────────────────────────────────────
    await showSubtitle(page, 'Step 5 — Reviews: who reviews whose PRs');
    await moveAndClick(page, `a[href*="/reviews"]`, 'Reviews nav', { postClickDelay: 2000 });
    await injectCursor(page);
    await injectSubtitleBar(page);
    await showSubtitle(page, 'Step 5 — Reviews: who reviews whose PRs');

    await panElements(page, '[class*="flex items-center gap-4"]', 5);
    await page.waitForTimeout(800);

    // Scroll to heatmap
    await page.evaluate(() => window.scrollTo({ top: 420, behavior: 'smooth' }));
    await page.waitForTimeout(1500);
    await showSubtitle(page, 'Step 5 — Review Heatmap: cross-team collaboration');

    // Pan heatmap cells
    await panElements(page, '[class*="rounded-md"][class*="h-9"]', 8);
    await page.waitForTimeout(1000);

    // Scroll to participation grid
    await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'smooth' }));
    await page.waitForTimeout(1200);
    await panElements(page, '[class*="rounded-xl p-3"]', 6);
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(600);

    // ── Step 6: PR Insights ────────────────────────────────────────────────
    await showSubtitle(page, 'Step 6 — PR Insights: filter and browse all pull requests');
    await moveAndClick(page, `a[href*="/pr-insights"]`, 'PR Insights nav', { postClickDelay: 2000 });
    await injectCursor(page);
    await injectSubtitleBar(page);
    await showSubtitle(page, 'Step 6 — PR Insights: filter and browse all pull requests');

    // Hover filter bar
    const stateSelect = page.locator('select').first();
    const stateVisible = await stateSelect.isVisible().catch(() => false);
    if (stateVisible) {
      const sBox = await stateSelect.boundingBox().catch(() => null);
      if (sBox) await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 10 });
      await page.waitForTimeout(600);
      await stateSelect.selectOption('MERGED');
      await page.waitForTimeout(1200);
      await stateSelect.selectOption('');
      await page.waitForTimeout(800);
    }

    // Pan PR rows
    await panElements(page, 'tbody tr', 5);
    await page.waitForTimeout(800);

    // ── Step 7: CI Insights ────────────────────────────────────────────────
    await showSubtitle(page, 'Step 7 — CI Insights: build health and flaky workflows');
    await moveAndClick(page, `a[href*="/ci-insights"]`, 'CI Insights nav', { postClickDelay: 2000 });
    await injectCursor(page);
    await injectSubtitleBar(page);
    await showSubtitle(page, 'Step 7 — CI Insights: build health and flaky workflows');

    await panElements(page, 'tbody tr', 4);
    await page.waitForTimeout(800);

    // Scroll to trend chart
    await page.evaluate(() => window.scrollTo({ top: 420, behavior: 'smooth' }));
    await page.waitForTimeout(1500);
    await panElements(page, '[class*="recharts"]', 2);
    await page.waitForTimeout(800);

    // Scroll to flaky table
    await page.evaluate(() => window.scrollTo({ top: 820, behavior: 'smooth' }));
    await page.waitForTimeout(1200);
    await showSubtitle(page, 'Step 7 — Flaky Workflows detected by retry patterns');
    await panElements(page, 'tbody tr', 4);
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(600);

    // ── Step 8: Commit Activity ────────────────────────────────────────────
    await showSubtitle(page, 'Step 8 — Commit Activity: frequency and after-hours signals');
    await moveAndClick(page, `a[href*="/commit-activity"]`, 'Commit Activity nav', { postClickDelay: 2000 });
    await injectCursor(page);
    await injectSubtitleBar(page);
    await showSubtitle(page, 'Step 8 — Commit Activity: frequency and after-hours signals');

    await panElements(page, 'tbody tr', 5);
    await page.waitForTimeout(800);

    // Scroll to churn chart
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
    await page.waitForTimeout(1500);
    await panElements(page, '[class*="recharts"]', 2);
    await page.waitForTimeout(800);

    // Scroll to burnout signal
    await page.evaluate(() => window.scrollTo({ top: 820, behavior: 'smooth' }));
    await page.waitForTimeout(1200);
    await showSubtitle(page, 'Step 8 — After-Hours Signal: potential burnout indicators');
    await panElements(page, '[class*="flex items-center gap-4"]', 4);
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(600);

    // ── Step 9: Digest ─────────────────────────────────────────────────────
    await showSubtitle(page, 'Step 9 — Digest: download team activity reports');
    await moveAndClick(page, `a[href*="/digest"]`, 'Digest nav', { postClickDelay: 2000 });
    await injectCursor(page);
    await injectSubtitleBar(page);
    await showSubtitle(page, 'Step 9 — Digest: download team activity reports');

    await page.waitForTimeout(1500);

    // Click period buttons
    for (const periodLabel of ['2 Weeks', '1 Month', '3 Months']) {
      const btn = page.locator(`button:has-text("${periodLabel}")`).first();
      const visible = await btn.isVisible().catch(() => false);
      if (visible) {
        await moveAndClick(page, btn, `period ${periodLabel}`, { postClickDelay: 800 });
      }
    }
    await page.waitForTimeout(600);

    // Scroll to digest preview
    await page.evaluate(() => window.scrollTo({ top: 380, behavior: 'smooth' }));
    await page.waitForTimeout(1500);
    await panElements(page, '[class*="rounded-xl px-4 py-3"]', 6);
    await page.waitForTimeout(800);

    // Hover CSV/PDF buttons
    const csvBtn = page.locator('button:has-text("CSV")').first();
    const csvVisible = await csvBtn.isVisible().catch(() => false);
    if (csvVisible) {
      const cBox = await csvBtn.boundingBox().catch(() => null);
      if (cBox) await page.mouse.move(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2, { steps: 10 });
      await page.waitForTimeout(600);
    }
    const pdfBtn = page.locator('button:has-text("PDF")').first();
    const pdfVisible = await pdfBtn.isVisible().catch(() => false);
    if (pdfVisible) {
      const pBox = await pdfBtn.boundingBox().catch(() => null);
      if (pBox) await page.mouse.move(pBox.x + pBox.width / 2, pBox.y + pBox.height / 2, { steps: 10 });
      await page.waitForTimeout(700);
    }

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(600);

    // ── Step 10: Dark / Light Mode Toggle ─────────────────────────────────
    await showSubtitle(page, 'Step 10 — Dark mode: switch themes instantly');

    const darkBtn = page.locator('button:has-text("Dark mode")').first();
    const darkVisible = await darkBtn.isVisible().catch(() => false);
    if (darkVisible) {
      await moveAndClick(page, darkBtn, 'dark mode toggle', { postClickDelay: 1800 });
      await injectCursor(page);
      await injectSubtitleBar(page);
      await showSubtitle(page, 'Step 10 — Dark mode: rich contrast for night owls');
      await page.waitForTimeout(2000);

      // Pan dashboard in dark mode
      await panElements(page, '[class*="rounded-2xl"]', 4);
      await page.waitForTimeout(1000);

      // Switch back to light
      const lightBtn = page.locator('button:has-text("Light mode")').first();
      const lightVisible = await lightBtn.isVisible().catch(() => false);
      if (lightVisible) {
        await moveAndClick(page, lightBtn, 'light mode toggle', { postClickDelay: 1500 });
        await injectCursor(page);
        await injectSubtitleBar(page);
        await showSubtitle(page, 'Step 10 — Light mode: clean and crisp for daytime');
        await page.waitForTimeout(1800);
      }
    }

    await showSubtitle(page, 'CodePulse — Built with GitHub API + Next.js + FastAPI');
    await panElements(page, '[class*="rounded-2xl"]', 4);
    await page.waitForTimeout(2500);
    await showSubtitle(page, '');
    await page.waitForTimeout(1000);

    console.log('Recording complete.');
  } catch (err) {
    console.error('DEMO ERROR:', err.message);
  } finally {
    await context.close();
    const video = page.video();
    if (video) {
      const src = await video.path();
      const dest = path.join(VIDEO_DIR, OUTPUT_NAME);
      try {
        fs.copyFileSync(src, dest);
        console.log('\n✓ Video saved:', dest);
      } catch (e) {
        console.error('ERROR copying video:', e.message);
        console.error('  Source:', src);
      }
    }
    await browser.close();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  const browser = await chromium.launch({ headless: true });
  if (REHEARSAL) {
    await rehearse(browser);
  } else {
    await record(browser);
  }
})();
