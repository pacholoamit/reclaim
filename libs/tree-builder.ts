import { dirname, relative, resolve } from 'path';
import type { CacheFolder } from './cache-scanner.js';
import { formatFileCount } from './cache-scanner.js';

export interface TreeNode {
  path: string;
  name: string;
  isCache: boolean;
  size?: string;
  fileCount?: number;
  children: TreeNode[];
  depth: number;
  parent?: TreeNode;
}

export interface TreeDisplayItem {
  value: string;
  label: string;
  hint?: string;
}

export function buildTree(cacheFolders: CacheFolder[], rootPath: string): TreeNode {
  const root: TreeNode = {
    path: rootPath,
    name: 'root',
    isCache: false,
    children: [],
    depth: 0
  };

  // Create a map to store all nodes by path for quick lookup
  const nodeMap = new Map<string, TreeNode>();
  nodeMap.set(rootPath, root);

  // Sort cache folders by path depth to ensure parents are created first
  const sortedFolders = [...cacheFolders].sort((a, b) => {
    const aDepth = a.path.split('/').length;
    const bDepth = b.path.split('/').length;
    return aDepth - bDepth;
  });

  for (const folder of sortedFolders) {
    const folderPath = resolve(folder.path);
    let currentPath = folderPath;
    const pathSegments: string[] = [];

    // Build path segments from cache folder to root
    while (currentPath !== rootPath && currentPath !== dirname(currentPath)) {
      pathSegments.unshift(currentPath);
      currentPath = dirname(currentPath);
    }

    // Ensure we include the root if it's not already there
    if (currentPath === rootPath) {
      pathSegments.unshift(rootPath);
    }

    // Create nodes for each path segment
    for (let i = 0; i < pathSegments.length; i++) {
      const segmentPath = pathSegments[i];
      
      if (segmentPath && !nodeMap.has(segmentPath)) {
        const parentPath = i > 0 ? pathSegments[i - 1] : rootPath;
        const parent = nodeMap.get(parentPath || rootPath);
        
        if (parent) {
          const pathName = segmentPath.split('/').pop();
          const newNode: TreeNode = {
            path: segmentPath,
            name: segmentPath === folderPath ? folder.name : (pathName || segmentPath),
            isCache: segmentPath === folderPath,
            size: segmentPath === folderPath ? folder.size : undefined,
            fileCount: segmentPath === folderPath ? folder.fileCount : undefined,
            children: [],
            depth: parent.depth + 1,
            parent
          };
          
          nodeMap.set(segmentPath, newNode);
          parent.children.push(newNode);
        }
      }
    }
  }

  return root;
}

export function treeToDisplayItems(node: TreeNode, items: TreeDisplayItem[] = [], rootPath: string, isLast: boolean[] = []): TreeDisplayItem[] {
  // Skip the root node itself, but process its children
  if (node.path !== rootPath) {
    const treeLines = buildTreeLines(isLast);
    const treeSymbol = getTreeSymbol(node);
    const sizeInfo = node.size ? ` (${node.size})` : '';
    const fileInfo = node.fileCount ? ` • ${formatFileCount(node.fileCount)}` : '';
    const relativePath = relative(rootPath, node.path) || node.name;
    
    items.push({
      value: node.path,
      label: `${treeLines}${treeSymbol} ${node.name}${sizeInfo}${fileInfo}`,
      hint: relativePath
    });
  }

  // Process children
  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child) {
      const isLastChild = i === children.length - 1;
      const newIsLast = node.path === rootPath ? [isLastChild] : [...isLast, isLastChild];
      treeToDisplayItems(child, items, rootPath, newIsLast);
    }
  }

  return items;
}

function buildTreeLines(isLast: boolean[]): string {
  if (isLast.length === 0) return '';
  
  let result = '';
  for (let i = 0; i < isLast.length - 1; i++) {
    result += isLast[i] ? '    ' : '│   ';
  }
  result += isLast[isLast.length - 1] ? '└── ' : '├── ';
  return result;
}

function getTreeSymbol(node: TreeNode): string {
  if (node.isCache) {
    return '📦'; // Cache directory
  } else {
    return '📁'; // Regular directory
  }
}

export function getCacheFoldersFromTree(node: TreeNode, cachePaths: string[] = []): string[] {
  if (node.isCache) {
    cachePaths.push(node.path);
  }

  for (const child of node.children) {
    getCacheFoldersFromTree(child, cachePaths);
  }

  return cachePaths;
}

export function getDisplayItemsWithSelection(cacheFolders: CacheFolder[], rootPath: string): { 
  items: TreeDisplayItem[], 
  defaultValues: string[] 
} {
  const tree = buildTree(cacheFolders, rootPath);
  const items = treeToDisplayItems(tree, [], rootPath);
  
  // Show all directories (both cache and parent directories)
  // This allows users to select parent directories for recursive selection
  const allItems = items.filter(item => {
    // Include cache directories and their parent directories
    const folder = cacheFolders.find(f => f.path === item.value);
    if (folder) return true; // Cache directory
    
    // Check if this directory has cache directories as descendants
    return hasChildCacheDirectories(item.value, cacheFolders);
  });

  // Get all cache folder paths AND their parent directories as default selected values
  const defaultValues = new Set<string>();
  
  // Add cache directories
  cacheFolders.forEach(f => defaultValues.add(f.path));
  
  // Add parent directories that contain cache directories
  allItems.forEach(item => {
    if (hasChildCacheDirectories(item.value, cacheFolders)) {
      defaultValues.add(item.value);
    }
  });

  return { items: allItems, defaultValues: Array.from(defaultValues) };
}

function hasChildCacheDirectories(dirPath: string, cacheFolders: CacheFolder[]): boolean {
  return cacheFolders.some(folder => folder.path.startsWith(dirPath + '/'));
}

export function getRecursiveSelection(selectedPaths: string[], cacheFolders: CacheFolder[]): string[] {
  const result = new Set<string>();
  
  for (const selectedPath of selectedPaths) {
    // If it's a cache directory, add it directly
    const cacheFolder = cacheFolders.find(f => f.path === selectedPath);
    if (cacheFolder) {
      result.add(selectedPath);
    } else {
      // If it's a parent directory, add all cache directories under it
      const childCaches = cacheFolders.filter(folder => 
        folder.path.startsWith(selectedPath + '/')
      );
      childCaches.forEach(cache => result.add(cache.path));
    }
  }
  
  return Array.from(result);
}