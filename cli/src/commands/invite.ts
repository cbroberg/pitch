import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { apiPost } from '../api.js';

export function inviteCommand(program: Command) {
  program
    .command('invite <pitchId> <email>')
    .description('Send an email invite for a pitch')
    .option('-m, --message <text>', 'Personal message')
    .option('--expires <days>', 'Expires in N days', parseInt)
    .action(async (pitchId, email, options) => {
      const spinner = ora(`Sending invite to ${email}…`).start();
      try {
        let expiresAt: number | null = null;
        if (options.expires) {
          expiresAt = Math.floor(Date.now() / 1000) + options.expires * 86400;
        }

        await apiPost('/api/invite', {
          pitchId,
          email,
          message: options.message,
          expiresAt,
        });

        spinner.succeed(`Invite sent to ${chalk.bold(email)}`);
      } catch (err) {
        spinner.fail('Failed to send invite');
        console.error(chalk.red(String(err)));
        process.exit(1);
      }
    });
}
