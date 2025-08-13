import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export const CACHE_DIRECTORIES = [
  'node_modules',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'target',
  'out',
  '.cache',
  '.parcel-cache',
  '.webpack',
  'coverage',
  '.nyc_output',
  '.jest',
  'tmp',
  'temp',
  '.tmp',
  '.temp',
  'logs',
  '*.log',
  '.DS_Store',
  'Thumbs.db'
];

export interface CacheFolder {
  path: string;
  name: string;
  size: string;
  type: string;
}

export async function getDirectorySize(dirPath: string): Promise<number> {
  try {
    const items = await readdir(dirPath);
    let totalSize = 0;

    for (const item of items) {
      const itemPath = join(dirPath, item);
      try {
        const stats = await stat(itemPath);
        if (stats.isDirectory()) {
          totalSize += await getDirectorySize(itemPath);
        } else {
          totalSize += stats.size;
        }
      } catch {
        // Skip files we can't access
      }
    }
    return totalSize;
  } catch {
    return 0;
  }
}

export function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export async function scanForCacheFolders(rootPath: string, onProgress?: (message: string) => void): Promise<CacheFolder[]> {
  const cacheFolders: CacheFolder[] = [];
  
  if (onProgress) onProgress('Scanning for cache directories...');

  async function scanDirectory(currentPath: string): Promise<void> {
    try {
      const items = await readdir(currentPath);
      
      for (const item of items) {
        const itemPath = join(currentPath, item);
        
        try {
          const stats = await stat(itemPath);
          
          if (stats.isDirectory()) {
            if (CACHE_DIRECTORIES.includes(item)) {
              const size = await getDirectorySize(itemPath);
              cacheFolders.push({
                path: itemPath,
                name: item,
                size: formatSize(size),
                type: 'cache directory'
              });
            } else {
              const depth = itemPath.split('/').length - rootPath.split('/').length;
              if (depth < 5) {
                await scanDirectory(itemPath);
              }
            }
          }
        } catch {
          // Skip files/directories we can't access
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  await scanDirectory(rootPath);
  
  if (onProgress) onProgress('Scan completed');
  
  return cacheFolders;
}