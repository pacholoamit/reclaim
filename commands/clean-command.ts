import { BaseCommand, type CommandContext } from './base-command.js';
import { scanForCacheFolders, formatSize } from '../libs/cache-scanner.js';
import { deleteFolder, parseSizeToBytes } from '../libs/file-operations.js';
import { text, confirm, multiselect, isCancel, cancel, log, spinner } from '@clack/prompts';
import { resolve } from 'path';
import { stat } from 'fs/promises';

export class CleanCommand extends BaseCommand {
  name = 'clean';
  description = 'Scan and clean cache directories';

  async execute(context: CommandContext): Promise<void> {
    console.log('🗑️  Reclaim - Cache Directory Cleaner\n');
    
    let targetPath = context.args[0];
    
    if (!targetPath) {
      const result = await text({
        message: 'Enter the directory path to scan:',
        placeholder: context.cwd,
        initialValue: context.cwd,
        validate: (value) => {
          if (!value) return 'Path is required';
        },
      });

      if (isCancel(result)) {
        cancel('Operation cancelled');
        process.exit(0);
      }

      targetPath = result;
    }

    const resolvedPath = resolve(targetPath);
    
    try {
      const pathStats = await stat(resolvedPath);
      if (!pathStats.isDirectory()) {
        log.error('Path is not a directory');
        process.exit(1);
      }
    } catch {
      log.error('Path does not exist or is not accessible');
      process.exit(1);
    }

    log.info(`Scanning: ${resolvedPath}`);

    const s = spinner();
    s.start('Scanning for cache directories...');

    const cacheFolders = await scanForCacheFolders(resolvedPath);
    s.stop('Scan completed');

    if (cacheFolders.length === 0) {
      log.success('No cache directories found!');
      console.log('All clean! 🎉');
      return;
    }

    log.info(`Found ${cacheFolders.length} cache directories`);

    cacheFolders.forEach(folder => {
      log.message(`${folder.name} (${folder.size}) - ${folder.path}`);
    });

    const selectedFolders = await multiselect({
      message: 'Select directories to delete:',
      options: cacheFolders.map(folder => ({
        value: folder.path,
        label: `${folder.name} (${folder.size})`,
        hint: folder.path
      })),
      required: false,
    });

    if (isCancel(selectedFolders)) {
      cancel('Operation cancelled');
      process.exit(0);
    }

    if (!selectedFolders || selectedFolders.length === 0) {
      log.info('No directories selected for deletion');
      console.log('Nothing to clean 🤷‍♂️');
      return;
    }

    const shouldDelete = await confirm({
      message: `Are you sure you want to delete ${selectedFolders.length} directories? This action cannot be undone.`,
    });

    if (isCancel(shouldDelete)) {
      cancel('Operation cancelled');
      process.exit(0);
    }

    if (!shouldDelete) {
      log.info('Deletion cancelled by user');
      console.log('No directories were deleted 🚫');
      return;
    }

    const deleteSpinner = spinner();
    deleteSpinner.start('Deleting selected directories...');

    let deletedCount = 0;
    let failedCount = 0;
    let totalSizeFreed = 0;

    for (const folderPath of selectedFolders as string[]) {
      const folder = cacheFolders.find(f => f.path === folderPath);
      if (folder) {
        const success = await deleteFolder(folderPath);
        if (success) {
          deletedCount++;
          totalSizeFreed += parseSizeToBytes(folder.size);
        } else {
          failedCount++;
          log.error(`Failed to delete: ${folder.name}`);
        }
      }
    }

    deleteSpinner.stop('Cleanup completed');

    if (deletedCount > 0) {
      log.success(`Successfully deleted ${deletedCount} directories`);
      log.info(`Space reclaimed: ${formatSize(totalSizeFreed)}`);
    }
    
    if (failedCount > 0) {
      log.warn(`Failed to delete ${failedCount} directories`);
    }

    console.log(`\n🎉 Reclaimed ${formatSize(totalSizeFreed)} of disk space!`);
  }
}