#!/usr/bin/env bun
import { getCommand, listCommands } from './commands/index.js';
import type { CommandContext } from './commands/base-command.js';

async function main() {
  const args = process.argv.slice(2);
  const commandName = args[0] || 'clean'; // Default to clean command
  const commandArgs = args.slice(1);

  const command = getCommand(commandName);
  
  if (!command) {
    console.log('❌ Unknown command:', commandName);
    console.log('\nAvailable commands:');
    listCommands().forEach(cmd => {
      console.log(`  ${cmd.name} - ${cmd.description}`);
    });
    process.exit(1);
  }

  const context: CommandContext = {
    args: commandArgs,
    cwd: process.cwd()
  };

  try {
    await command.execute(context);
  } catch (error) {
    console.error('❌ An unexpected error occurred:');
    console.error(error);
    process.exit(1);
  }
}

main();