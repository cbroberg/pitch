import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { apiGet, apiPost } from '../api.js';

export function foldersCommand(program: Command) {
  const folders = program.command('folders').description('Manage folders');

  folders
    .command('list')
    .alias('ls')
    .description('List folders')
    .action(async () => {
      const spinner = ora('Fetching folders…').start();
      try {
        const tree = await apiGet('/api/folders');
        spinner.stop();
        printTree(tree, 0);
      } catch (err) {
        spinner.fail('Failed');
        console.error(chalk.red(String(err)));
      }
    });

  folders
    .command('create <name>')
    .description('Create a folder')
    .action(async (name) => {
      const spinner = ora('Creating folder…').start();
      try {
        await apiPost('/api/folders', { name });
        spinner.succeed(`Folder created: ${chalk.bold(name)}`);
      } catch (err) {
        spinner.fail('Failed');
        console.error(chalk.red(String(err)));
      }
    });
}

function printTree(
  nodes: Array<{ name: string; id: string; children: unknown[] }>,
  depth: number,
) {
  for (const node of nodes) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}${chalk.dim('📁')} ${node.name} ${chalk.dim(`[${node.id}]`)}`);
    if (node.children?.length) {
      printTree(
        node.children as Array<{ name: string; id: string; children: unknown[] }>,
        depth + 1,
      );
    }
  }
}
