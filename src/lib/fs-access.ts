/**
 * Utility functions for the File System Access API.
 */

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Checks and requests permission for a directory or file handle.
 */
export async function verifyPermission(
  fileHandle: FileSystemHandle,
  withWrite: boolean = false
): Promise<boolean> {
  const opts: any = {
    mode: withWrite ? 'readwrite' : 'read',
  };

  const handleAny = fileHandle as any;

  // Check if we already have permission
  if ((await handleAny.queryPermission(opts)) === 'granted') {
    return true;
  }

  // Request permission
  if ((await handleAny.requestPermission(opts)) === 'granted') {
    return true;
  }

  return false;
}

export interface ScannedPDF {
  name: string;
  file: File;
}

/**
 * Recursively or flatly scans a FileSystemDirectoryHandle for PDF files.
 */
export async function scanDirectoryForPDFs(
  dirHandle: FileSystemDirectoryHandle
): Promise<ScannedPDF[]> {
  const results: ScannedPDF[] = [];
  const dirAny = dirHandle as any;

  for await (const entry of dirAny.values()) {
    if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
      try {
        const fileHandle = entry as any;
        const file = await fileHandle.getFile();
        results.push({
          name: entry.name,
          file,
        });
      } catch (err) {
        console.error(`Failed to retrieve file for entry ${entry.name}:`, err);
      }
    }
  }

  return results;
}
