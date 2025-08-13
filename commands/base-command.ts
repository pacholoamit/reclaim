export interface CommandContext {
  args: string[];
  cwd: string;
}

export abstract class BaseCommand {
  abstract name: string;
  abstract description: string;
  
  abstract execute(context: CommandContext): Promise<void>;
}