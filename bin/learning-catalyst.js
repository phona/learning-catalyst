#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get workspace from command line arguments
const workspace = process.argv[2];

if (!workspace) {
  console.log('Usage: learning-catalyst <workspace-path>');
  console.log('Example: learning-catalyst test_workspace');
  process.exit(1);
}

// Resolve workspace path to absolute path
const workspacePath = path.resolve(workspace);

console.log(`Starting Learning Catalyst with workspace: ${workspacePath}`);

// Start the development server first
const viteProcess = spawn('yarn', ['dev'], {
  stdio: 'inherit',
  shell: true,
});

// Wait a bit for the dev server to start, then start Electron
setTimeout(() => {
  const electronProcess = spawn('yarn', ['run', 'dev:workspace', workspacePath], {
    stdio: 'inherit',
    shell: true,
  });

  electronProcess.on('close', (code) => {
    console.log(`Electron process exited with code ${code}`);
    viteProcess.kill();
  });
}, 3000);

viteProcess.on('close', (code) => {
  console.log(`Vite process exited with code ${code}`);
  process.exit(code);
});
