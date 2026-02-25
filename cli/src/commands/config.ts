import { Command } from 'commander';
import chalk from 'chalk';
import { readConfig, writeConfig } from '../config.js';

export function configCommand(program: Command) {
  const cmd = program
    .command('config')
    .description('Configure Pitch Vault CLI')
    .option('--server <url>', 'Server URL')
    .option('--key <apiKey>', 'API key')
    .action((options) => {
      if (!options.server && !options.key) {
        const config = readConfig();
        console.log(chalk.bold('Current config:'));
        console.log('  server:', config.server || chalk.dim('(not set)'));
        console.log('  apiKey:', config.apiKey ? chalk.dim('••••••••') : chalk.dim('(not set)'));
        return;
      }

      const updates: Record<string, string> = {};
      if (options.server) updates.server = options.server;
      if (options.key) updates.apiKey = options.key;

      writeConfig(updates);
      console.log(chalk.green('✓ Config saved'));
    });

  return cmd;
}
