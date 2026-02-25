import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { apiGet } from '../api.js';

export function statsCommand(program: Command) {
  program
    .command('stats <pitchId>')
    .description('Show view stats for a pitch')
    .action(async (pitchId) => {
      const spinner = ora('Fetching stats…').start();
      try {
        const data = await apiGet(`/api/stats/${pitchId}`);
        spinner.stop();

        const { pitch, stats } = data;
        console.log(chalk.bold(`\n  ${pitch.title}`));
        console.log(`  Total views:   ${stats.total}`);
        console.log(`  Unique viewers: ${pitch.uniqueViews}`);
        console.log(
          `  Avg duration:  ${stats.avgDuration > 0 ? `${Math.floor(stats.avgDuration / 60)}m ${stats.avgDuration % 60}s` : '—'}`,
        );

        if (stats.byDay.length > 0) {
          console.log(chalk.bold('\n  Views by day:'));
          for (const d of stats.byDay.slice(-7)) {
            const bar = '█'.repeat(Math.min(20, d.count));
            console.log(`    ${d.day}  ${bar} ${d.count}`);
          }
        }
        console.log('');
      } catch (err) {
        spinner.fail('Failed to fetch stats');
        console.error(chalk.red(String(err)));
        process.exit(1);
      }
    });
}
