import { readdir, stat } from "fs/promises";
import { join } from "path";

export const CACHE_DIRECTORIES = [
  "node_modules",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "target",
  "out",
  ".cache",
  ".parcel-cache",
  ".webpack",
  "coverage",
  ".nyc_output",
  ".jest",
  "tmp",
  "temp",
  ".tmp",
  ".temp",
  "logs",
  "*.log",
  ".DS_Store",
  "Thumbs.db",
];

const IGNORED_DIRECTORIES = [".git", ".svn", ".hg", "CVS", ".bzr"];

export interface CacheFolder {
  path: string;
  name: string;
  size: string;
  sizeBytes: number;
  fileCount: number;
  type: string;
}

export interface DirectoryStats {
  sizeBytes: number;
  fileCount: number;
}

export async function getDirectorySize(dirPath: string): Promise<number> {
  const stats = await getDirectoryStats(dirPath);
  return stats.sizeBytes;
}

export async function getDirectoryStats(dirPath: string): Promise<DirectoryStats> {
  try {
    const items = await readdir(dirPath);
    let totalSize = 0;
    let totalFiles = 0;

    for (const item of items) {
      const itemPath = join(dirPath, item);
      try {
        const stats = await stat(itemPath);
        if (stats.isDirectory()) {
          const subStats = await getDirectoryStats(itemPath);
          totalSize += subStats.sizeBytes;
          totalFiles += subStats.fileCount;
        } else {
          totalSize += stats.size;
          totalFiles += 1;
        }
      } catch {
        // Skip files we can't access
      }
    }
    
    return { sizeBytes: totalSize, fileCount: totalFiles };
  } catch {
    return { sizeBytes: 0, fileCount: 0 };
  }
}

export function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatFileCount(count: number): string {
  if (count === 1) return "1 file";
  if (count < 1000) return `${count} files`;
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K files`;
  return `${(count / 1000000).toFixed(1)}M files`;
}

export async function scanForCacheFolders(
  rootPath: string,
  onProgress?: (message: string) => void
): Promise<CacheFolder[]> {
  const cacheFolders: CacheFolder[] = [];

  if (onProgress) onProgress("Scanning for cache directories...");

  async function scanDirectory(currentPath: string): Promise<void> {
    try {
      const items = await readdir(currentPath);

      for (const item of items) {
        const itemPath = join(currentPath, item);

        try {
          const stats = await stat(itemPath);

          if (stats.isDirectory()) {
            // Skip ignored directories (like .git)
            if (IGNORED_DIRECTORIES.includes(item)) {
              continue;
            }

            if (CACHE_DIRECTORIES.includes(item)) {
              const stats = await getDirectoryStats(itemPath);
              cacheFolders.push({
                path: itemPath,
                name: item,
                size: formatSize(stats.sizeBytes),
                sizeBytes: stats.sizeBytes,
                fileCount: stats.fileCount,
                type: "cache directory",
              });
            } else {
              const depth = itemPath.split("/").length - rootPath.split("/").length;
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

  if (onProgress) onProgress("Scan completed");

  return cacheFolders;
}
