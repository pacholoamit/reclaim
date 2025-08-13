import { rm } from 'fs/promises';

export async function deleteFolder(folderPath: string): Promise<boolean> {
  try {
    await rm(folderPath, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export function parseSizeToBytes(sizeStr: string): number {
  const parts = sizeStr.split(' ');
  const value = parts[0];
  const unit = parts[1];
  
  if (!value || !unit) {
    return 0;
  }
  
  let bytes = parseFloat(value);
  
  switch (unit) {
    case 'KB': bytes *= 1024; break;
    case 'MB': bytes *= 1024 * 1024; break;
    case 'GB': bytes *= 1024 * 1024 * 1024; break;
    case 'TB': bytes *= 1024 * 1024 * 1024 * 1024; break;
  }
  
  return bytes;
}