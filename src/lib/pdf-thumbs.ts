import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Reads a PDF file Blob and returns its page count.
 */
export async function getPDFPageCount(fileBlob: Blob): Promise<number> {
  try {
    const arrayBuffer = await fileBlob.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    return pdf.numPages;
  } catch (error) {
    console.error('Error reading PDF page count:', error);
    // Return a default mock page count if reading fails, to allow book addition
    return 100;
  }
}

/**
 * Generates a thumbnail image (data URL) of the first page of a PDF.
 */
export async function generateThumbnail(fileBlob: Blob): Promise<string> {
  try {
    const arrayBuffer = await fileBlob.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    // Set standard small thumbnail viewport
    const scale = 0.4; // low scale as requested
    const viewport = page.getViewport({ scale });

    // Create an offscreen canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get canvas context');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render PDF page into canvas context
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    await page.render(renderContext as any).promise;

    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (error) {
    console.error('Error generating PDF thumbnail:', error);
    // Return an empty string, UI will display a nice solid-colored fallback
    return '';
  }
}

/**
 * Dynamic rendering function for the reader component.
 * Renders a specific page of a PDF onto a provided HTMLCanvasElement.
 */
export async function renderPDFPage(
  fileBlob: Blob,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<{ width: number; height: number; totalPages: number } | null> {
  try {
    const arrayBuffer = await fileBlob.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    // Clamp page number
    const targetPage = Math.min(Math.max(1, pageNumber), totalPages);
    const page = await pdf.getPage(targetPage);

    const viewport = page.getViewport({ scale });
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context not available');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    await page.render(renderContext as any).promise;

    return {
      width: viewport.width,
      height: viewport.height,
      totalPages
    };
  } catch (error) {
    console.error('Error rendering PDF page in reader:', error);
    return null;
  }
}
