import { CleanCommand } from './clean-command.js';
import type { BaseCommand } from './base-command.js';

export const commands: BaseCommand[] = [
  new CleanCommand(),
];

export function getCommand(name: string): BaseCommand | undefined {
  return commands.find(cmd => cmd.name === name);
}

export function listCommands(): BaseCommand[] {
  return commands;
}