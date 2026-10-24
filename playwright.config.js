// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const VIEWPORTS = [
  [1440, 900],
  [1280, 600],
  [800, 600],
  [844, 390],
  [390, 844],
  [320, 640],
];
const ENGINES = [
  ['chromium', devices['Desktop Chrome']],
  ['webkit', devices['Desktop Safari']],
];

// Tests tagged @once (data, content) run in a single project so they don't repeat 12 times.
// Tests tagged @file run only in the file-chromium project.
const ONCE_PROJECT = 'chromium-1440x900';

const projects = [];
for (const [engine, device] of ENGINES) {
  for (const [width, height] of VIEWPORTS) {
    const name = `${engine}-${width}x${height}`;
    projects.push({
      name,
      use: { ...device, viewport: { width, height } },
      grepInvert: name === ONCE_PROJECT ? /@file/ : /@once|@file/,
    });
  }
}
projects.push({
  name: 'file-chromium',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    baseURL: pathToFileURL(path.join(__dirname, 'index.html')).href,
  },
  grep: /@file/,
});

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  // CI also writes playwright-report/, which the workflow uploads when a run fails.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'node tests/serve.js',
    port: 4173,
    reuseExistingServer: true,
  },
  projects,
});
