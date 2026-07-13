import { useState, useEffect, type ChangeEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Book } from '../../db';
import { isFileSystemAccessSupported, scanDirectoryForPDFs, verifyPermission } from '../../lib/fs-access';
import { getPDFPageCount, generateThumbnail } from '../../lib/pdf-thumbs';
import Button from '../../ui/Button';
import EmptyState from '../../ui/EmptyState';
import BookDetailsPanel from './BookDetailsPanel';
import { BookOpen, FolderOpen, Upload } from 'lucide-react';

const DERS_LER = ['Türkçe', 'Matematik', 'Tarih', 'Coğrafya', 'Vatandaşlık', 'Denemeler'];

const SPINE_COLORS = ['#2C4A6E', '#7A302B', '#2E5C3B', '#5C4A37', '#4A3E56', '#3E4A56'];

export default function LibraryShelf({ onOpenBook }: { onOpenBook: (book: Book) => void }) {
  const books = useLiveQuery(() => db.books.toArray()) || [];
  const dailyPageRateSetting = useLiveQuery(() => db.settings.get('dailyPageRate'));
  const examDateSetting = useLiveQuery(() => db.settings.get('examDate'));
  const directoryHandleSetting = useLiveQuery(() => db.settings.get('directoryHandle'));

  const dailyPageRate = dailyPageRateSetting?.value || 12;
  const examDateStr = examDateSetting?.value || '2026-09-06T10:15:00';
  const examDate = new Date(examDateStr);

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [hasFolderPermission, setHasFolderPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Load existing directory handle
  useEffect(() => {
    if (directoryHandleSetting?.value) {
      setFolderHandle(directoryHandleSetting.value);
    }
  }, [directoryHandleSetting]);

  const matchDersFromFileName = (fileName: string): string => {
    const lower = fileName.toLowerCase();
    if (lower.includes('tarih')) return 'Tarih';
    if (lower.includes('cografya') || lower.includes('coğrafya')) return 'Coğrafya';
    if (lower.includes('matematik')) return 'Matematik';
    if (lower.includes('turkce') || lower.includes('türkçe')) return 'Türkçe';
    if (lower.includes('vatandası') || lower.includes('vatandaşlık')) return 'Vatandaşlık';
    if (lower.includes('deneme')) return 'Denemeler';
    return 'Tarih'; // default
  };

  const cleanFileName = (fileName: string): string => {
    return fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
  };

  const getRandomSpineColor = () => {
    return SPINE_COLORS[Math.floor(Math.random() * SPINE_COLORS.length)];
  };

  // Directory Connect Flow
  const handleConnectFolder = async () => {
    if (!isFileSystemAccessSupported()) return;
    try {
      setIsScanning(true);
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'read'
      });
      await db.settings.put({ key: 'directoryHandle', value: dirHandle });
      setFolderHandle(dirHandle);
      setHasFolderPermission(true);
      await scanAndSyncFolder(dirHandle);
    } catch (err) {
      console.error('Klasör erişim hatası:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleRefreshFolder = async () => {
    if (!folderHandle) return;
    try {
      setIsScanning(true);
      const granted = await verifyPermission(folderHandle);
      if (granted) {
        setHasFolderPermission(true);
        await scanAndSyncFolder(folderHandle);
      } else {
        setHasFolderPermission(false);
        alert('Klasör okuma izni verilmedi.');
      }
    } catch (err) {
      console.error('Klasör tarama hatası:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const scanAndSyncFolder = async (dirHandle: FileSystemDirectoryHandle) => {
    const scanned = await scanDirectoryForPDFs(dirHandle);
    let countAdded = 0;
    
    for (const item of scanned) {
      const existing = books.find(b => b.dosyaAdi === item.name);
      if (!existing) {
        const pageCount = await getPDFPageCount(item.file);
        const thumbnail = await generateThumbnail(item.file);
        
        await db.books.add({
          id: crypto.randomUUID(),
          ders: matchDersFromFileName(item.name),
          ad: cleanFileName(item.name),
          dosyaAdi: item.name,
          sayfaSayisi: pageCount,
          kalinanSayfa: 1,
          renk: getRandomSpineColor(),
          thumbDataUrl: thumbnail,
          // In handle mode, we don't store blob, we match and open from DirectoryHandle at runtime
          fileKey: item.name,
          eklenme: new Date()
        });
        countAdded++;
      }
    }
    console.log(`Klasör tarandı: ${countAdded} yeni kitap eklendi.`);
  };

  // Fallback File Picker Flow
  const handleFallbackUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsScanning(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const existing = books.find(b => b.dosyaAdi === file.name);
      if (!existing) {
        const pageCount = await getPDFPageCount(file);
        const thumbnail = await generateThumbnail(file);
        
        await db.books.add({
          id: crypto.randomUUID(),
          ders: matchDersFromFileName(file.name),
          ad: cleanFileName(file.name),
          dosyaAdi: file.name,
          sayfaSayisi: pageCount,
          kalinanSayfa: 1,
          renk: getRandomSpineColor(),
          thumbDataUrl: thumbnail,
          blob: file, // Store blob for fallback picker mode
          eklenme: new Date()
        });
      }
    }
    setIsScanning(false);
  };

  // Group books by ders
  const groupedBooks = DERS_LER.reduce((acc, ders) => {
    acc[ders] = books.filter(b => b.ders === ders);
    return acc;
  }, {} as Record<string, Book[]>);

  const handleOpenReader = async (book: Book) => {
    // If FileSystemHandle was used, we need to load the file blob dynamically
    if (book.fileKey && !book.blob && folderHandle) {
      try {
        const hasPerm = await verifyPermission(folderHandle);
        if (!hasPerm) {
          alert('Klasör izinlerinizi güncellemeniz gerekiyor.');
          return;
        }
        const fileHandle = await folderHandle.getFileHandle(book.fileKey);
        const file = await fileHandle.getFile();
        onOpenBook({ ...book, blob: file });
      } catch (err) {
        console.error('Dosya yüklenemedi. Klasör taşınmış olabilir:', err);
        alert('PDF açılamadı — dosya taşınmış olabilir. Klasörü yeniden bağlayın.');
      }
    } else {
      onOpenBook(book);
    }
  };

  return (
    <div className="kp-library-section">
      <div className="kp-section-header">
        <div>
          <h2 className="kp-section-title">KÜTÜPHANE VE KİTAPLIK</h2>
          <p className="kp-section-subtitle">KPSS Ders Kitapları, Soru Bankaları ve Denemeler</p>
        </div>
        
        <div className="kp-library-actions">
          {isFileSystemAccessSupported() ? (
            <Button variant="secondary" onClick={folderHandle ? handleRefreshFolder : handleConnectFolder} disabled={isScanning}>
              <FolderOpen size={16} />
              {folderHandle ? 'Klasör Bağlantısını Güncelle ve Tara' : 'Ders Klasörü Bağla'}
            </Button>
          ) : null}

          <div className="kp-file-upload-wrapper">
            <Button variant="primary">
              <Upload size={16} />
              PDF Yükle (Manuel)
            </Button>
            <input type="file" multiple accept="application/pdf" onChange={handleFallbackUpload} disabled={isScanning} />
          </div>
        </div>
      </div>

      {isScanning && <div className="kp-scanning-indicator">Kütüphane taranıyor ve indeksler çıkartılıyor...</div>}

      <div className="kp-library-layout">
        {/* Bookshelf Shelf System */}
        <div className="kp-bookshelf-container">
          {books.length === 0 ? (
            <EmptyState
              title="Kütüphaneniz Boş"
              description="Klasör bağlayarak ya da manuel PDF yükleyerek ders kitaplarınızı, soru bankalarınızı veya denemelerinizi kitaplığa ekleyin."
            />
          ) : (
            DERS_LER.map(ders => {
              const shelfBooks = groupedBooks[ders] || [];
              return (
                <div key={ders} className="kp-shelf-row">
                  <div className="kp-shelf-label">
                    <span>{ders.toUpperCase()}</span>
                    <span className="kp-shelf-count">({shelfBooks.length})</span>
                  </div>
                  <div className="kp-shelf-board">
                    <div className="kp-shelf-spines">
                      {shelfBooks.map(book => {
                        const progress = book.sayfaSayisi > 0 ? Math.round((book.kalinanSayfa / book.sayfaSayisi) * 100) : 0;
                        const height = Math.min(170, Math.max(90, book.sayfaSayisi / 3));
                        
                        return (
                          <div
                            key={book.id}
                            className={`kp-book-spine ${selectedBook?.id === book.id ? 'active' : ''}`}
                            style={{
                              height: `${height}px`,
                              backgroundColor: book.renk,
                              borderLeft: `5px solid rgba(255, 255, 255, 0.15)`
                            }}
                            onClick={() => { setSelectedBook(book); }}
                            title={`${book.ad} (${progress}%)`}
                          >
                            <div className="kp-book-spine-title">{book.ad}</div>
                            <div className="kp-book-spine-progress">{progress}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Book Details Panel */}
        {selectedBook && (
          <BookDetailsPanel
            book={selectedBook}
            dailyPageRate={dailyPageRate}
            examDate={examDate}
            onOpenReader={handleOpenReader}
            onClose={() => setSelectedBook(null)}
          />
        )}
      </div>
    </div>
  );
}
