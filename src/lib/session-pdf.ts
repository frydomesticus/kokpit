import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { type Book, type QuestionCrop } from '../db';

function transliterateTurkish(str: string): string {
  const mapping: Record<string, string> = {
    'ı': 'i', 'İ': 'I',
    'ş': 's', 'Ş': 'S',
    'ğ': 'g', 'Ğ': 'G',
    'ç': 'c', 'Ç': 'C',
    'ö': 'o', 'Ö': 'O',
    'ü': 'u', 'Ü': 'U'
  };
  return str.replace(/[ıİşŞğĞçÇöÖüÜ]/g, char => mapping[char] || char);
}

export interface SayfaKarmasiSource {
  book: Book;
  pages: number[]; // 1-based indices
  blob: Blob;
}

export async function generateSayfaKarmasi(
  sources: SayfaKarmasiSource[],
  orderMode: 'round-robin' | 'shuffle',
  captionEnabled: boolean
): Promise<{ pdfBytes: Uint8Array; skippedSources: string[] }> {
  const pdfDoc = await PDFDocument.create();
  const skippedSources: string[] = [];

  // 1. Resolve all source pages to a flat array of page tasks
  interface PageTask {
    bookName: string;
    pageIndex: number; // 0-based
    srcDoc: PDFDocument;
    originalPageNum: number;
  }

  const tasks: PageTask[] = [];

  for (const src of sources) {
    try {
      const arrayBuffer = await src.blob.arrayBuffer();
      const srcDoc = await PDFDocument.load(new Uint8Array(arrayBuffer), { ignoreEncryption: true });
      
      for (const pNum of src.pages) {
        if (pNum >= 1 && pNum <= srcDoc.getPageCount()) {
          tasks.push({
            bookName: src.book.ad,
            pageIndex: pNum - 1,
            srcDoc,
            originalPageNum: pNum
          });
        }
      }
    } catch (err) {
      console.error(`Source loading failed: ${src.book.ad}`, err);
      skippedSources.push(src.book.ad);
    }
  }

  if (tasks.length === 0) {
    throw new Error('Birleştirilecek geçerli sayfa bulunamadı.');
  }

  // 2. Order the page tasks
  const orderedTasks: PageTask[] = [];
  if (orderMode === 'shuffle') {
    // Global shuffle (seeded by Date.now)
    const shuffled = [...tasks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    orderedTasks.push(...shuffled);
  } else {
    // Round-robin grouping by source books
    const sourceGroups: Record<string, PageTask[]> = {};
    for (const t of tasks) {
      if (!sourceGroups[t.bookName]) sourceGroups[t.bookName] = [];
      sourceGroups[t.bookName].push(t);
    }
    
    const groupKeys = Object.keys(sourceGroups);
    let maxLen = 0;
    groupKeys.forEach(k => {
      maxLen = Math.max(maxLen, sourceGroups[k].length);
    });

    for (let i = 0; i < maxLen; i++) {
      for (const key of groupKeys) {
        if (i < sourceGroups[key].length) {
          orderedTasks.push(sourceGroups[key][i]);
        }
      }
    }
  }

  // 3. Copy pages and draw footers if captionEnabled
  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

  for (const t of orderedTasks) {
    const [copiedPage] = await pdfDoc.copyPages(t.srcDoc, [t.pageIndex]);
    const addedPage = pdfDoc.addPage(copiedPage);

    if (captionEnabled) {
      const cleanName = transliterateTurkish(t.bookName);
      const footerText = `KAYNAK: ${cleanName} . s.${t.originalPageNum}`;
      addedPage.drawText(footerText, {
        x: 20,
        y: 15,
        size: 7.5,
        font: courierFont,
        color: rgb(0.3, 0.3, 0.3)
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return { pdfBytes, skippedSources };
}

export interface CropSource {
  crop: QuestionCrop;
  imageBlob: Blob;
}

export async function generateSoruKarmasi(
  crops: CropSource[],
  ders: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBoldFont = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // A4 dimensions in points
  const pageWidth = 595.27;
  const pageHeight = 841.89;

  // Grid margins
  const gutter = 16;
  const topMargin = 50;
  const bottomMargin = 50;
  const sideMargin = 16;

  const colWidth = (pageWidth - 3 * gutter) / 2;
  const colHeight = pageHeight - topMargin - bottomMargin;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentColumnIndex = 0; // 0 = Left, 1 = Right
  let currentY = topMargin; // Top-down coordinate tracker

  const drawHeaderFooter = (page: any, dersName: string) => {
    // Header
    const titleText = transliterateTurkish(`KOKPIT CALISMA OTURUMU - ${dersName.toUpperCase()}`);
    page.drawText(titleText, {
      x: sideMargin + gutter,
      y: pageHeight - 30,
      size: 9,
      font: courierBoldFont,
      color: rgb(0.1, 0.1, 0.1)
    });
    page.drawLine({
      start: { x: sideMargin + gutter, y: pageHeight - 34 },
      end: { x: pageWidth - sideMargin - gutter, y: pageHeight - 34 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8)
    });

    // Footer
    const dateText = new Date().toLocaleDateString('tr-TR');
    const footerText = transliterateTurkish(`KOKPIT OTURUMU . ${dersName} . ${dateText}`);
    page.drawText(footerText, {
      x: sideMargin + gutter,
      y: 20,
      size: 8,
      font: courierFont,
      color: rgb(0.4, 0.4, 0.4)
    });
  };

  drawHeaderFooter(currentPage, ders);

  let qNumber = 1;

  for (const src of crops) {
    const arrayBuffer = await src.imageBlob.arrayBuffer();
    const image = await pdfDoc.embedJpg(new Uint8Array(arrayBuffer));
    
    // Calculate aspect ratio
    const imgWidth = image.width;
    const imgHeight = image.height;
    const scaleFactor = colWidth / imgWidth;
    const drawnHeight = imgHeight * scaleFactor;

    const labelHeight = 14;
    const qSpacing = 16;
    const neededHeight = drawnHeight + labelHeight + qSpacing;

    // Check if we need to wrap to the next column or page
    if (currentY + neededHeight > topMargin + colHeight) {
      if (currentColumnIndex === 0) {
        // Move to the right column
        currentColumnIndex = 1;
        currentY = topMargin;
      } else {
        // Create a new page
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        drawHeaderFooter(currentPage, ders);
        currentColumnIndex = 0;
        currentY = topMargin;
      }
    }

    // Determine layout coordinates
    // X Coordinate:
    // Col 0: sideMargin + gutter
    // Col 1: sideMargin + gutter + colWidth + gutter
    const colX = sideMargin + gutter + currentColumnIndex * (colWidth + gutter);
    
    // Y Coordinate in pdf-lib is bottom-up
    const drawY = pageHeight - currentY - neededHeight + qSpacing;

    // Draw question label
    currentPage.drawText(`${qNumber}.`, {
      x: colX,
      y: drawY + drawnHeight + 2,
      size: 10,
      font: courierBoldFont,
      color: rgb(0.1, 0.1, 0.1)
    });

    // Draw the question crop image
    currentPage.drawImage(image, {
      x: colX,
      y: drawY,
      width: colWidth,
      height: drawnHeight
    });

    // Advance cursor
    currentY += neededHeight;
    qNumber++;
  }

  return await pdfDoc.save();
}
