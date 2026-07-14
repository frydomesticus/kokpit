import { useState } from 'react';
import { db, type Book, type QuestionCrop } from '../../db';
import { getBookBlob, rasterizeCrop } from '../../lib/pdf-render';
import { generateSayfaKarmasi, generateSoruKarmasi, type SayfaKarmasiSource, type CropSource } from '../../lib/session-pdf';
import { generateThumbnail, getPDFPageCount } from '../../lib/pdf-thumbs';
import { newId } from '../../lib/id';

export function parsePageRange(rangeStr: string, maxPages: number): number[] {
  const pages: number[] = [];
  const tokens = rangeStr.split(',');
  for (const t of tokens) {
    const clean = t.trim();
    if (!clean) continue;
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length !== 2) throw new Error(`Geçersiz aralık formatı: ${clean}`);
      const start = parseInt(parts[0].trim());
      const end = parseInt(parts[1].trim());
      if (isNaN(start) || isNaN(end) || start < 1 || end < 1 || start > end) {
        throw new Error(`Geçersiz sayfa aralığı: ${clean}`);
      }
      if (end > maxPages) {
        throw new Error(`Sayfa aralığı sınırları aşıyor (Maks: ${maxPages}): ${clean}`);
      }
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    } else {
      const p = parseInt(clean);
      if (isNaN(p) || p < 1) {
        throw new Error(`Geçersiz sayfa numarası: ${clean}`);
      }
      if (p > maxPages) {
        throw new Error(`Sayfa numarası sınırları aşıyor (Maks: ${maxPages}): ${clean}`);
      }
      pages.push(p);
    }
  }
  return pages;
}

export function selectCropsBalanced(pool: QuestionCrop[], limit: number): QuestionCrop[] {
  const groups: Record<string, QuestionCrop[]> = {};
  pool.forEach(c => {
    if (!groups[c.bookId]) groups[c.bookId] = [];
    groups[c.bookId].push(c);
  });
  
  const bookIds = Object.keys(groups);
  bookIds.forEach(bid => {
    groups[bid].sort(() => Math.random() - 0.5);
  });
  
  const selected: QuestionCrop[] = [];
  let added = true;
  let roundIndex = 0;
  
  while (selected.length < limit && added) {
    added = false;
    for (const bid of bookIds) {
      const list = groups[bid];
      if (roundIndex < list.length) {
        selected.push(list[roundIndex]);
        added = true;
        if (selected.length >= limit) break;
      }
    }
    roundIndex++;
  }
  
  return selected;
}

export function useSessionGenerator() {
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [skipped, setSkipped] = useState<string[]>([]);
  const [generatedBook, setGeneratedBook] = useState<Book | null>(null);

  const buildSayfaKarmasi = async (
    sessionName: string,
    selections: { book: Book; range: string }[],
    orderMode: 'round-robin' | 'shuffle',
    captionEnabled: boolean,
    folderHandle: FileSystemDirectoryHandle | null
  ) => {
    setLoading(true);
    setProgressText('Kaynak kitaplar taranıyor...');
    setSkipped([]);
    setGeneratedBook(null);

    const sources: SayfaKarmasiSource[] = [];

    for (const sel of selections) {
      try {
        const pages = parsePageRange(sel.range, sel.book.sayfaSayisi);
        if (pages.length === 0) continue;

        const blob = await getBookBlob(sel.book, folderHandle);
        sources.push({
          book: sel.book,
          pages,
          blob
        });
      } catch (err) {
        console.error(`Book skipped: ${sel.book.ad}`, err);
        setSkipped(prev => [...prev, sel.book.ad]);
      }
    }

    if (sources.length === 0) {
      setLoading(false);
      throw new Error('Oturum üretmek için en az bir geçerli kitap ve sayfa aralığı seçilmelidir.');
    }

    try {
      setProgressText('PDF sayfaları birleştiriliyor...');
      const { pdfBytes, skippedSources } = await generateSayfaKarmasi(sources, orderMode, captionEnabled);
      if (skippedSources.length > 0) {
        setSkipped(prev => [...prev, ...skippedSources]);
      }

      setProgressText('Kitaplık kaydı ve önizleme oluşturuluyor...');
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const numPages = await getPDFPageCount(pdfBlob);
      const thumbnail = await generateThumbnail(pdfBlob);

      const newBookId = newId();
      const newBook: Book = {
        id: newBookId,
        ders: 'Oturumlar',
        ad: sessionName.trim() || 'Sayfa Karması',
        dosyaAdi: 'oturum.pdf',
        sayfaSayisi: numPages,
        kalinanSayfa: 1,
        renk: '#4A3E56',
        thumbDataUrl: thumbnail,
        blob: pdfBlob,
        eklenme: new Date()
      };

      await db.books.add(newBook);
      await db.sessions.add({
        id: newId(),
        ad: newBook.ad,
        tip: 'sayfa',
        kaynaklar: sources.map(s => s.book.ad),
        bookId: newBookId,
        created: new Date()
      });

      setGeneratedBook(newBook);
      setProgressText('Oturum başarıyla üretildi!');
    } catch (err) {
      console.error(err);
      throw new Error('Birleştirilmiş PDF oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  const buildSoruKarmasi = async (
    sessionName: string,
    filteredCrops: QuestionCrop[],
    count: number,
    dersName: string,
    folderHandle: FileSystemDirectoryHandle | null
  ) => {
    setLoading(true);
    setProgressText('Soru havuzu oluşturuluyor...');
    setSkipped([]);
    setGeneratedBook(null);

    if (filteredCrops.length === 0) {
      setLoading(false);
      throw new Error('Filtre kriterlerine uygun soru bulunamadı.');
    }

    // 1. Balanced selection
    const selected = selectCropsBalanced(filteredCrops, count);
    const cropSources: CropSource[] = [];

    // 2. Fetch books and crops sequentially (memory discipline)
    let processed = 0;
    for (const crop of selected) {
      setProgressText(`Sorular görselleştiriliyor (${++processed} / ${selected.length})...`);
      try {
        const book = await db.books.get(crop.bookId);
        if (!book) {
          throw new Error('Kitap veritabanında bulunamadı.');
        }
        const bookBlob = await getBookBlob(book, folderHandle);
        const imageBlob = await rasterizeCrop(bookBlob, crop.page, crop.rect, 2.5);
        cropSources.push({ crop, imageBlob });
      } catch (err) {
        console.error('Soru görselleştirilemedi:', err);
      }
    }

    if (cropSources.length === 0) {
      setLoading(false);
      throw new Error('Oturum üretmek için hiçbir soru görseli hazırlanamadı.');
    }

    try {
      setProgressText('A4 Sayfaları tasarlanıyor (2 sütunlu)...');
      const pdfBytes = await generateSoruKarmasi(cropSources, dersName);

      setProgressText('Kitaplık kaydı oluşturuluyor...');
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const numPages = await getPDFPageCount(pdfBlob);
      const thumbnail = await generateThumbnail(pdfBlob);

      const newBookId = newId();
      const newBook: Book = {
        id: newBookId,
        ders: 'Oturumlar',
        ad: sessionName.trim() || 'Soru Karması',
        dosyaAdi: 'oturum.pdf',
        sayfaSayisi: numPages,
        kalinanSayfa: 1,
        renk: '#3E4A56',
        thumbDataUrl: thumbnail,
        blob: pdfBlob,
        eklenme: new Date()
      };

      await db.books.add(newBook);
      await db.sessions.add({
        id: newId(),
        ad: newBook.ad,
        tip: 'soru',
        kaynaklar: Array.from(new Set(cropSources.map(s => s.crop.bookId))), // Storing unique source book IDs
        bookId: newBookId,
        created: new Date()
      });

      setGeneratedBook(newBook);
      setProgressText('Oturum başarıyla üretildi!');
    } catch (err) {
      console.error(err);
      throw new Error('Soru karması PDF oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  const clearGeneratedBook = () => setGeneratedBook(null);

  return {
    loading,
    progressText,
    skipped,
    generatedBook,
    clearGeneratedBook,
    buildSayfaKarmasi,
    buildSoruKarmasi
  };
}
