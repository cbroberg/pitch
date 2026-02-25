import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { apiUpload } from '../api.js';
import { getServer } from '../config.js';

export function pushCommand(program: Command) {
  program
    .command('push [dir]')
    .description('Upload a pitch from a directory or file')
    .option('-t, --title <title>', 'Pitch title')
    .option('-d, --description <desc>', 'Pitch description')
    .option('--publish', 'Publish immediately')
    .action(async (dir = '.', options) => {
      const targetPath = path.resolve(dir);

      if (!fs.existsSync(targetPath)) {
        console.error(chalk.red(`Path not found: ${targetPath}`));
        process.exit(1);
      }

      const spinner = ora('Collecting files…').start();

      // Get files to upload
      let filePaths: string[] = [];
      let basePath: string;

      if (fs.statSync(targetPath).isFile()) {
        filePaths = [targetPath];
        basePath = path.dirname(targetPath);
      } else {
        basePath = targetPath;
        // Check for .pitchignore
        const ignoreFile = path.join(targetPath, '.pitchignore');
        let ignorePatterns: string[] = [
          'node_modules/**',
          '.git/**',
          '.DS_Store',
          '*.log',
        ];
        if (fs.existsSync(ignoreFile)) {
          const extra = fs
            .readFileSync(ignoreFile, 'utf-8')
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith('#'));
          ignorePatterns = [...ignorePatterns, ...extra];
        }

        filePaths = await glob('**/*', {
          cwd: targetPath,
          nodir: true,
          ignore: ignorePatterns,
        });
        filePaths = filePaths.map((f) => path.join(targetPath, f));
      }

      if (filePaths.length === 0) {
        spinner.fail('No files found');
        process.exit(1);
      }

      const title =
        options.title ||
        path
          .basename(targetPath)
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase());

      spinner.text = `Uploading ${filePaths.length} file(s)…`;

      const form = new FormData();
      form.append('title', title);
      if (options.description) form.append('description', options.description);
      if (options.publish) form.append('isPublished', 'true');

      for (const filePath of filePaths) {
        const relativeName = path.relative(basePath, filePath);
        const buffer = fs.readFileSync(filePath);
        form.append('files', new Blob([buffer]), relativeName);
      }

      try {
        const result = await apiUpload('/api/cli/push', form);
        spinner.succeed(`Pushed: ${chalk.bold(result.pitch.title)}`);
        const server = getServer();
        console.log(chalk.dim(`  ID: ${result.pitch.id}`));
        console.log(chalk.dim(`  Manage: ${server}/pitches/${result.pitch.id}`));
      } catch (err) {
        spinner.fail('Push failed');
        console.error(chalk.red(String(err)));
        process.exit(1);
      }
    });
}
