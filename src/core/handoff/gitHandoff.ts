import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitHandoffOptions {
  rootDir: string;
  clientName?: string;
  projectName?: string;
  commitMessage?: string;
  initialTag?: string;
}

export interface GitHandoffResult {
  success: boolean;
  message: string;
}

/**
 * Resets dirty AI-prompt commit history and initializes a pristine, client-grade Git repository
 */
export async function pristineGitHandoff(options: GitHandoffOptions): Promise<GitHandoffResult> {
  const {
    rootDir,
    clientName = 'Client',
    projectName = 'Project',
    commitMessage = `feat: initial release of bespoke platform for ${clientName}`,
    initialTag = 'v1.0.0'
  } = options;

  const gitDir = path.join(rootDir, '.git');

  try {
    // 1. Remove existing dirty git directory
    if (await fs.pathExists(gitDir)) {
      await fs.remove(gitDir);
    }

    // 2. Initialize fresh git repository
    await execAsync('git init -b main', { cwd: rootDir }).catch(async () => {
      // Fallback if older git doesn't support -b main
      await execAsync('git init', { cwd: rootDir });
      await execAsync('git checkout -b main', { cwd: rootDir }).catch(() => {});
    });

    // 3. Stage all sanitized files
    await execAsync('git add .', { cwd: rootDir });

    // 4. Create pristine initial commit
    await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { cwd: rootDir });

    // 5. Create initial release tag
    if (initialTag) {
      await execAsync(`git tag -a ${initialTag} -m "Release ${initialTag} for ${clientName}"`, { cwd: rootDir }).catch(() => {});
    }

    return {
      success: true,
      message: `Pristine Git repository initialized with clean commit and tag ${initialTag}`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to initialize pristine git: ${error?.message || String(error)}`
    };
  }
}
