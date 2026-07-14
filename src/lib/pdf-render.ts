import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { type Book } from '../db';
import { verifyPermission } from './fs-access';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function getBookBlob(book: Book, folderHandle?: FileSystemDirectoryHandle | null): Promise<Blob> {
  if (book.blob) {
    return book.blob;
  }
  if (book.fileKey && folderHandle) {
    const hasPerm = await verifyPermission(folderHandle);
    if (!hasPerm) {
      throw new Error('Klasör izni bulunmuyor.');
    }
    const fileHandle = await folderHandle.getFileHandle(book.fileKey);
    return await fileHandle.getFile();
  }
  throw new Error('PDF dosyasının kaynağına erişilemedi.');
}

export async function rasterizeCrop(
  fileBlob: Blob,
  pageNumber: number,
  rect: [number, number, number, number], // [nx, ny, nw, nh]
  targetScale: number = 2.5
): Promise<Blob> {
  const arrayBuffer = await fileBlob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);

  const viewport = page.getViewport({ scale: targetScale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context could not be created');
  }

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport
  };
  await page.render(renderContext as any).promise;

  const [nx, ny, nw, nh] = rect;
  const px = nx * canvas.width;
  const py = ny * canvas.height;
  const pw = nw * canvas.width;
  const ph = nh * canvas.height;

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = pw;
  cropCanvas.height = ph;

  const cropCtx = cropCanvas.getContext('2d');
  if (!cropCtx) {
    throw new Error('Crop canvas context could not be created');
  }

  cropCtx.drawImage(
    canvas,
    px, py, pw, ph,
    0, 0, pw, ph
  );

  return new Promise<Blob>((resolve, reject) => {
    cropCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Cropping to blob failed'));
    }, 'image/jpeg', 0.95);
  });
}
