import { Command } from 'commander';
import { configCommand } from './commands/config.js';
import { listCommand } from './commands/list.js';
import { pushCommand } from './commands/push.js';
import { shareCommand } from './commands/share.js';
import { inviteCommand } from './commands/invite.js';
import { statsCommand } from './commands/stats.js';
import { foldersCommand } from './commands/folders.js';

const program = new Command();

program
  .name('pitch')
  .description('Pitch Vault CLI — manage and share your pitches')
  .version('0.1.0');

configCommand(program);
listCommand(program);
pushCommand(program);
shareCommand(program);
inviteCommand(program);
statsCommand(program);
foldersCommand(program);

program.parse();
