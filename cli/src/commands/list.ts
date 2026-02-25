import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { apiGet } from '../api.js';

export function listCommand(program: Command) {
  program
    .command('list')
    .alias('ls')
    .description('List all pitches')
    .action(async () => {
      const spinner = ora('Fetching pitches…').start();
      try {
        const pitches = await apiGet('/api/cli/list');
        spinner.stop();

        if (pitches.length === 0) {
          console.log(chalk.dim('No pitches found.'));
          return;
        }

        for (const p of pitches) {
          const status = p.isPublished ? chalk.green('live') : chalk.yellow('draft');
          console.log(
            `  ${chalk.bold(p.title)} ${chalk.dim(`[${p.id}]`)} ${status} — ${p.totalViews} views`,
          );
        }
      } catch (err) {
        spinner.fail('Failed to fetch pitches');
        console.error(chalk.red(String(err)));
      }
    });
}
