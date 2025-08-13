import { BaseCommand, type CommandContext } from './base-command.js';
import { scanForCacheFolders, formatSize, formatFileCount } from '../libs/cache-scanner.js';
import { deleteFolder } from '../libs/file-operations.js';
import { getDisplayItemsWithSelection, getRecursiveSelection } from '../libs/tree-builder.js';
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

    // Calculate total statistics
    const totalSize = cacheFolders.reduce((sum, folder) => sum + folder.sizeBytes, 0);
    const totalFiles = cacheFolders.reduce((sum, folder) => sum + folder.fileCount, 0);
    
    log.info(`Found ${cacheFolders.length} cache directories • ${formatSize(totalSize)} • ${formatFileCount(totalFiles)}`);

    // Build tree structure for better visualization
    const { items, defaultValues } = getDisplayItemsWithSelection(cacheFolders, resolvedPath);

    const selectedPaths = await multiselect({
      message: 'Select directories to delete (📁 = folder, 📦 = cache):',
      options: items,
      initialValues: defaultValues,
      required: false,
    });

    if (isCancel(selectedPaths)) {
      cancel('Operation cancelled');
      process.exit(0);
    }

    if (!selectedPaths || selectedPaths.length === 0) {
      log.info('No directories selected for deletion');
      console.log('Nothing to clean 🤷‍♂️');
      return;
    }

    // Apply recursive selection logic
    const selectedFolders = getRecursiveSelection(selectedPaths as string[], cacheFolders);
    
    if (selectedFolders.length === 0) {
      log.info('No cache directories found in selection');
      console.log('Nothing to clean 🤷‍♂️');
      return;
    }

    // Calculate statistics for selected folders
    const selectedCacheFolders = cacheFolders.filter(f => selectedFolders.includes(f.path));
    const selectedSize = selectedCacheFolders.reduce((sum, folder) => sum + folder.sizeBytes, 0);
    const selectedFilesCount = selectedCacheFolders.reduce((sum, folder) => sum + folder.fileCount, 0);

    const shouldDelete = await confirm({
      message: `Delete ${selectedFolders.length} directories (${formatSize(selectedSize)} • ${formatFileCount(selectedFilesCount)})? This cannot be undone.`,
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
    let totalFilesDeleted = 0;

    for (const folderPath of selectedFolders as string[]) {
      const folder = cacheFolders.find(f => f.path === folderPath);
      if (folder) {
        const success = await deleteFolder(folderPath);
        if (success) {
          deletedCount++;
          totalSizeFreed += folder.sizeBytes;
          totalFilesDeleted += folder.fileCount;
        } else {
          failedCount++;
          log.error(`Failed to delete: ${folder.name}`);
        }
      }
    }

    deleteSpinner.stop('Cleanup completed');

    if (deletedCount > 0) {
      log.success(`Successfully deleted ${deletedCount} directories`);
      log.info(`Space reclaimed: ${formatSize(totalSizeFreed)} • ${formatFileCount(totalFilesDeleted)} removed`);
    }
    
    if (failedCount > 0) {
      log.warn(`Failed to delete ${failedCount} directories`);
    }

    console.log(`\n🎉 Reclaimed ${formatSize(totalSizeFreed)} disk space • ${formatFileCount(totalFilesDeleted)} removed!`);
  }
}