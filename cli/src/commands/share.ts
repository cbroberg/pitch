import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { apiPost } from '../api.js';
import { getServer } from '../config.js';

export function shareCommand(program: Command) {
  program
    .command('share <pitchId>')
    .description('Generate an anonymous token link for a pitch')
    .option('--expires <days>', 'Expires in N days', parseInt)
    .option('--max-uses <n>', 'Max uses', parseInt)
    .action(async (pitchId, options) => {
      const spinner = ora('Creating token…').start();
      try {
        let expiresAt: number | null = null;
        if (options.expires) {
          expiresAt = Math.floor(Date.now() / 1000) + options.expires * 86400;
        }

        const token = await apiPost('/api/tokens', {
          pitchId,
          type: 'anonymous',
          expiresAt,
          maxUses: options.maxUses ?? null,
        });

        const server = getServer();
        const url = `${server}/view/${token.token}`;
        spinner.succeed('Token created');
        console.log(chalk.bold('\n  Share link:'));
        console.log(`  ${chalk.cyan(url)}\n`);
      } catch (err) {
        spinner.fail('Failed to create token');
        console.error(chalk.red(String(err)));
        process.exit(1);
      }
    });
}
