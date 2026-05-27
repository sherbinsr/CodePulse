'use strict';
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const OUT_DIR = path.join(__dirname, 'screenshots', 'frames');

// ── Same dummy data as demo script ────────────────────────────────────────────
const MOCK_USER = { login: 'alex-dev', name: 'Alex Johnson', avatar_url: null };
const MOCK_ORGS = [{ login: 'acme-corp', avatar_url: null, description: 'Acme Corporation Engineering' }];
const MOCK_SYNC  = { status: 'done', prs_synced: 1247, repos_synced: 12, error: null };

const MOCK_OVERVIEW = {
  total_repos: 12, total_prs: 1247, merged_prs: 984, open_prs: 178, closed_prs: 85,
  merge_rate: 78.9, avg_merge_time_hours: 18.4, avg_review_time_hours: 6.2,
  total_reviews: 3891, unique_contributors: 24
};
const MOCK_DEVELOPERS = [
  { login: 'sarah-chen',   avatar_url: null, total_prs: 187, merged_prs: 156, open_prs: 22, merge_rate: 83.4, avg_merge_hours: 14.2, total_additions: 48200, total_deletions: 31100, reviews_given: 412, approvals: 380, change_requests: 32 },
  { login: 'james-wilson',  avatar_url: null, total_prs: 162, merged_prs: 131, open_prs: 19, merge_rate: 80.9, avg_merge_hours: 16.8, total_additions: 39800, total_deletions: 28400, reviews_given: 356, approvals: 318, change_requests: 38 },
  { login: 'priya-patel',   avatar_url: null, total_prs: 145, merged_prs: 118, open_prs: 17, merge_rate: 81.4, avg_merge_hours: 12.6, total_additions: 35600, total_deletions: 24200, reviews_given: 298, approvals: 271, change_requests: 27 },
  { login: 'tom-nguyen',    avatar_url: null, total_prs: 134, merged_prs: 107, open_prs: 21, merge_rate: 79.9, avg_merge_hours: 19.4, total_additions: 31200, total_deletions: 19800, reviews_given: 247, approvals: 219, change_requests: 28 },
  { login: 'emily-ross',    avatar_url: null, total_prs: 121, merged_prs: 96,  open_prs: 18, merge_rate: 79.3, avg_merge_hours: 21.1, total_additions: 28900, total_deletions: 18600, reviews_given: 213, approvals: 192, change_requests: 21 },
  { login: 'carlos-diaz',   avatar_url: null, total_prs: 108, merged_prs: 84,  open_prs: 16, merge_rate: 77.8, avg_merge_hours: 24.3, total_additions: 25400, total_deletions: 16200, reviews_given: 178, approvals: 158, change_requests: 20 },
  { login: 'lisa-kim',      avatar_url: null, total_prs: 96,  merged_prs: 74,  open_prs: 14, merge_rate: 77.1, avg_merge_hours: 22.8, total_additions: 22100, total_deletions: 14800, reviews_given: 154, approvals: 138, change_requests: 16 },
  { login: 'mike-obi',      avatar_url: null, total_prs: 84,  merged_prs: 63,  open_prs: 13, merge_rate: 75.0, avg_merge_hours: 28.6, total_additions: 18600, total_deletions: 12400, reviews_given: 132, approvals: 114, change_requests: 18 },
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
  { pr_author: 'sarah-chen',   reviewer: 'james-wilson',  review_count: 48 },
  { pr_author: 'sarah-chen',   reviewer: 'priya-patel',   review_count: 31 },
  { pr_author: 'sarah-chen',   reviewer: 'tom-nguyen',    review_count: 22 },
  { pr_author: 'james-wilson', reviewer: 'sarah-chen',    review_count: 41 },
  { pr_author: 'james-wilson', reviewer: 'emily-ross',    review_count: 27 },
  { pr_author: 'james-wilson', reviewer: 'carlos-diaz',   review_count: 18 },
  { pr_author: 'priya-patel',  reviewer: 'sarah-chen',    review_count: 36 },
  { pr_author: 'priya-patel',  reviewer: 'james-wilson',  review_count: 29 },
  { pr_author: 'priya-patel',  reviewer: 'mike-obi',      review_count: 14 },
  { pr_author: 'tom-nguyen',   reviewer: 'priya-patel',   review_count: 33 },
  { pr_author: 'tom-nguyen',   reviewer: 'sarah-chen',    review_count: 24 },
  { pr_author: 'emily-ross',   reviewer: 'tom-nguyen',    review_count: 28 },
  { pr_author: 'carlos-diaz',  reviewer: 'emily-ross',    review_count: 22 },
  { pr_author: 'lisa-kim',     reviewer: 'carlos-diaz',   review_count: 20 },
  { pr_author: 'mike-obi',     reviewer: 'lisa-kim',      review_count: 18 },
];
const MOCK_PRS = {
  data: [
    { id:1,  number:2341, repo:'acme-corp/api-gateway',   title:'feat: add rate limiting middleware for API endpoints',   state:'MERGED', author:'sarah-chen',   author_avatar:null, additions:312, deletions:48,  changed_files:8,  reviews_count:3, time_to_merge_hours:11.2, time_to_first_review_hours:3.1,  created_at:'2025-04-28T09:12:00', merged_at:'2025-04-28T20:19:00', closed_at:null },
    { id:2,  number:2338, repo:'acme-corp/web-dashboard', title:'feat: add dark mode support across all dashboard views', state:'MERGED', author:'james-wilson',  author_avatar:null, additions:891, deletions:204, changed_files:24, reviews_count:4, time_to_merge_hours:18.7, time_to_first_review_hours:5.4,  created_at:'2025-04-26T14:30:00', merged_at:'2025-04-27T09:11:00', closed_at:null },
    { id:3,  number:2336, repo:'acme-corp/auth-service',  title:'fix: resolve token expiry race condition on refresh',    state:'MERGED', author:'priya-patel',   author_avatar:null, additions:87,  deletions:34,  changed_files:4,  reviews_count:2, time_to_merge_hours:8.4,  time_to_first_review_hours:2.1,  created_at:'2025-04-25T11:00:00', merged_at:'2025-04-25T19:24:00', closed_at:null },
    { id:4,  number:2334, repo:'acme-corp/mobile-app',    title:'feat: implement push notification deep linking',         state:'OPEN',   author:'tom-nguyen',    author_avatar:null, additions:456, deletions:89,  changed_files:12, reviews_count:1, time_to_merge_hours:null, time_to_first_review_hours:7.8,  created_at:'2025-04-24T16:45:00', merged_at:null, closed_at:null },
    { id:5,  number:2332, repo:'acme-corp/data-pipeline', title:'perf: optimise Kafka consumer batch processing',         state:'MERGED', author:'emily-ross',    author_avatar:null, additions:234, deletions:112, changed_files:7,  reviews_count:3, time_to_merge_hours:22.1, time_to_first_review_hours:8.3,  created_at:'2025-04-23T10:15:00', merged_at:'2025-04-24T08:21:00', closed_at:null },
    { id:6,  number:2329, repo:'acme-corp/api-gateway',   title:'chore: upgrade dependencies to patch security advisories',state:'MERGED', author:'carlos-diaz',   author_avatar:null, additions:142, deletions:138, changed_files:3,  reviews_count:2, time_to_merge_hours:14.6, time_to_first_review_hours:4.7,  created_at:'2025-04-22T08:30:00', merged_at:'2025-04-22T23:06:00', closed_at:null },
    { id:7,  number:2327, repo:'acme-corp/web-dashboard', title:'feat: add CSV and PDF export to digest page',            state:'MERGED', author:'lisa-kim',      author_avatar:null, additions:678, deletions:23,  changed_files:11, reviews_count:3, time_to_merge_hours:16.3, time_to_first_review_hours:5.9,  created_at:'2025-04-21T13:20:00', merged_at:'2025-04-22T05:38:00', closed_at:null },
    { id:8,  number:2325, repo:'acme-corp/billing',       title:'fix: correct prorated billing calculation for mid-cycle',state:'OPEN',   author:'mike-obi',      author_avatar:null, additions:198, deletions:67,  changed_files:6,  reviews_count:2, time_to_merge_hours:null, time_to_first_review_hours:11.2, created_at:'2025-04-20T15:00:00', merged_at:null, closed_at:null },
  ],
  total: 1247
};
const MOCK_CI_SUMMARY = [
  { repo:'acme-corp/api-gateway',   name:'api-gateway',   total_runs:642, successful_runs:578, failed_runs:64,  first_try_pass_rate:88.2, overall_pass_rate:90.0, avg_duration_seconds:142 },
  { repo:'acme-corp/web-dashboard', name:'web-dashboard', total_runs:581, successful_runs:493, failed_runs:88,  first_try_pass_rate:82.1, overall_pass_rate:84.9, avg_duration_seconds:218 },
  { repo:'acme-corp/auth-service',  name:'auth-service',  total_runs:428, successful_runs:401, failed_runs:27,  first_try_pass_rate:92.8, overall_pass_rate:93.7, avg_duration_seconds:98  },
  { repo:'acme-corp/mobile-app',    name:'mobile-app',    total_runs:394, successful_runs:321, failed_runs:73,  first_try_pass_rate:78.4, overall_pass_rate:81.5, avg_duration_seconds:284 },
  { repo:'acme-corp/data-pipeline', name:'data-pipeline', total_runs:312, successful_runs:261, failed_runs:51,  first_try_pass_rate:79.5, overall_pass_rate:83.7, avg_duration_seconds:376 },
];
const MOCK_BUILD_TRENDS = [
  ...['2025-03-10','2025-03-17','2025-03-24','2025-03-31','2025-04-07','2025-04-14','2025-04-21','2025-04-28'].flatMap((week, i) => [
    { week, repo_name:'api-gateway',   avg_duration_seconds: 164 - i*4, run_count: 28 + i*2 },
    { week, repo_name:'web-dashboard', avg_duration_seconds: 251 - i*6, run_count: 24 + i*2 },
  ])
];
const MOCK_FLAKY = [
  { workflow_name:'integration-tests', repo_name:'mobile-app',    flaky_count:41, total_runs:394, flakiness_rate:24.8 },
  { workflow_name:'e2e-cypress',       repo_name:'web-dashboard', flaky_count:38, total_runs:581, flakiness_rate:16.3 },
  { workflow_name:'load-tests',        repo_name:'data-pipeline', flaky_count:29, total_runs:312, flakiness_rate:14.1 },
];
const MOCK_COMMIT_ACTIVITY = [
  { author_login:'sarah-chen',   author_avatar:null, total_commits:412, active_days:68, commits_per_active_day:6.1, after_hours_commits:124, weekend_commits:48,  after_hours_pct:30.1, weekend_pct:11.7, repos_contributed:7 },
  { author_login:'james-wilson', author_avatar:null, total_commits:378, active_days:62, commits_per_active_day:6.1, after_hours_commits:89,  weekend_commits:34,  after_hours_pct:23.5, weekend_pct:9.0,  repos_contributed:6 },
  { author_login:'tom-nguyen',   author_avatar:null, total_commits:298, active_days:58, commits_per_active_day:5.1, after_hours_commits:112, weekend_commits:67,  after_hours_pct:37.6, weekend_pct:22.5, repos_contributed:5 },
  { author_login:'mike-obi',     author_avatar:null, total_commits:167, active_days:38, commits_per_active_day:4.4, after_hours_commits:82,  weekend_commits:51,  after_hours_pct:49.1, weekend_pct:30.5, repos_contributed:3 },
  { author_login:'priya-patel',  author_avatar:null, total_commits:341, active_days:71, commits_per_active_day:4.8, after_hours_commits:61,  weekend_commits:22,  after_hours_pct:17.9, weekend_pct:6.5,  repos_contributed:5 },
  { author_login:'emily-ross',   author_avatar:null, total_commits:271, active_days:54, commits_per_active_day:5.0, after_hours_commits:48,  weekend_commits:19,  after_hours_pct:17.7, weekend_pct:7.0,  repos_contributed:4 },
];
const MOCK_CODE_CHURN = [
  ...['2025-03-10','2025-03-17','2025-03-24','2025-03-31','2025-04-07','2025-04-14','2025-04-21','2025-04-28'].flatMap((week,i) => [
    { week, repo_name:'api-gateway',   total_commits:28+i*2, unique_authors:9 },
    { week, repo_name:'web-dashboard', total_commits:24+i*2, unique_authors:8 },
    { week, repo_name:'mobile-app',    total_commits:19+i,   unique_authors:6 },
    { week, repo_name:'auth-service',  total_commits:16+i,   unique_authors:5 },
    { week, repo_name:'data-pipeline', total_commits:12+i,   unique_authors:4 },
  ])
];
const MOCK_DIGEST = {
  org:'acme-corp', period_label:'Last 1 Month',
  since:'2025-03-28T00:00:00', until:'2025-04-28T00:00:00',
  total_prs:233, merged_prs:187, open_prs:31, merge_rate:80.3,
  avg_merge_hours:16.8, avg_review_hours:5.9, unique_contributors:24, total_reviews:712,
  top_contributors:[
    { login:'sarah-chen',   avatar_url:null, total_prs:48, merged_prs:41, reviews_given:112 },
    { login:'james-wilson', avatar_url:null, total_prs:42, merged_prs:35, reviews_given:98  },
    { login:'priya-patel',  avatar_url:null, total_prs:37, merged_prs:31, reviews_given:84  },
    { login:'tom-nguyen',   avatar_url:null, total_prs:33, merged_prs:27, reviews_given:71  },
    { login:'emily-ross',   avatar_url:null, total_prs:28, merged_prs:23, reviews_given:63  },
  ],
  top_repos:[
    { name:'api-gateway',   total_prs:68, merged_prs:58, merge_rate:85.3 },
    { name:'web-dashboard', total_prs:61, merged_prs:49, merge_rate:80.3 },
    { name:'mobile-app',    total_prs:44, merged_prs:34, merge_rate:77.3 },
    { name:'auth-service',  total_prs:38, merged_prs:33, merge_rate:86.8 },
  ]
};

async function setupMocks(context) {
  await context.route('**/api/orgs',                          r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(MOCK_ORGS) }));
  await context.route('**/api/orgs/*/sync/status',            r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(MOCK_SYNC) }));
  await context.route('**/api/orgs/*/sync',                   r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ job_id:1, status:'running', message:'Sync started' }) }));
  await context.route('**/api/analytics/*/overview',          r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(MOCK_OVERVIEW) }));
  await context.route('**/api/analytics/*/developers',        r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(MOCK_DEVELOPERS) }));
  await context.route('**/api/analytics/*/repositories',      r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(MOCK_REPOS) }));
  await context.route('**/api/analytics/*/trends*',           r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(MOCK_TRENDS) }));
  await context.route('**/api/analytics/*/review-network',    r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(MOCK_REVIEW_NETWORK) }));
  await context.route('**/api/analytics/*/prs*',              r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(MOCK_PRS) }));
  await context.route('**/api/analytics/*/ci-summary',        r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(MOCK_CI_SUMMARY) }));
  await context.route('**/api/analytics/*/ci-trends',         r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(MOCK_BUILD_TRENDS) }));
  await context.route('**/api/analytics/*/ci-flaky',          r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(MOCK_FLAKY) }));
  await context.route('**/api/analytics/*/commit-activity',   r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(MOCK_COMMIT_ACTIVITY) }));
  await context.route('**/api/analytics/*/commit-churn',      r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(MOCK_CODE_CHURN) }));
  await context.route('**/api/analytics/*/digest*',           r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(MOCK_DIGEST) }));
}

async function shot(page, name, scrollY = 0) {
  if (scrollY > 0) {
    await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), scrollY);
    await page.waitForTimeout(400);
  } else {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(200);
  }
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, type: 'png' });
  console.log(`  ✓ ${name}.png`);
  return file;
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  await setupMocks(context);
  const page = await context.newPage();

  // Inject auth
  await page.goto(BASE_URL);
  await page.evaluate(u => { localStorage.setItem('token','demo-token'); localStorage.setItem('user', JSON.stringify(u)); }, MOCK_USER);

  const org = 'acme-corp';
  const pages = [
    { name: '01-landing',         url: BASE_URL,                                            wait: 1000 },
    { name: '02-overview',        url: `${BASE_URL}/dashboard?org=${org}`,                  wait: 2500 },
    { name: '03-repositories',    url: `${BASE_URL}/dashboard/repositories?org=${org}`,     wait: 2000 },
    { name: '04-repositories-tbl',url: `${BASE_URL}/dashboard/repositories?org=${org}`,     wait: 2000, scroll: 380 },
    { name: '05-developers',      url: `${BASE_URL}/dashboard/developers?org=${org}`,        wait: 2000 },
    { name: '06-reviews',         url: `${BASE_URL}/dashboard/reviews?org=${org}`,           wait: 2500 },
    { name: '07-reviews-heatmap', url: `${BASE_URL}/dashboard/reviews?org=${org}`,           wait: 2500, scroll: 440 },
    { name: '08-pr-insights',     url: `${BASE_URL}/dashboard/pr-insights?org=${org}`,       wait: 2000 },
    { name: '09-ci-insights',     url: `${BASE_URL}/dashboard/ci-insights?org=${org}`,       wait: 2500 },
    { name: '10-ci-trends',       url: `${BASE_URL}/dashboard/ci-insights?org=${org}`,       wait: 2500, scroll: 420 },
    { name: '11-commit-activity', url: `${BASE_URL}/dashboard/commit-activity?org=${org}`,   wait: 2500 },
    { name: '12-commit-burnout',  url: `${BASE_URL}/dashboard/commit-activity?org=${org}`,   wait: 2500, scroll: 820 },
    { name: '13-digest',          url: `${BASE_URL}/dashboard/digest?org=${org}`,             wait: 2500 },
    { name: '14-digest-preview',  url: `${BASE_URL}/dashboard/digest?org=${org}`,             wait: 2500, scroll: 380 },
  ];

  console.log('Taking screenshots...');
  for (const p of pages) {
    if (p.url !== page.url()) {
      await page.goto(p.url);
      await page.waitForTimeout(p.wait);
    }
    await shot(page, p.name, p.scroll || 0);
  }

  // Dark mode screenshot
  await page.goto(`${BASE_URL}/dashboard?org=${org}`);
  await page.waitForTimeout(2000);
  const darkBtn = page.locator('button:has-text("Dark mode")').first();
  if (await darkBtn.isVisible().catch(() => false)) {
    await darkBtn.click();
    await page.waitForTimeout(1200);
    await shot(page, '15-dark-mode', 0);
  }

  await browser.close();
  console.log('\nAll screenshots saved to:', OUT_DIR);
})();
