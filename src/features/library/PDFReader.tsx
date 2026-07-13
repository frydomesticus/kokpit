import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Book } from '../../db';
import { renderPDFPage } from '../../lib/pdf-thumbs';
import { useDrawing } from './useDrawing';
import Button from '../../ui/Button';
import {
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, X, Loader,
  Edit2, Highlighter, Trash2, RotateCcw, Bookmark, ChevronDown
} from 'lucide-react';

interface PDFReaderProps {
  book: Book;
  onClose: () => void;
}

export default function PDFReader({ book, onClose }: PDFReaderProps) {
  const [currentPage, setCurrentPage] = useState<number>((book as any).initialPage || book.kalinanSayfa || 1);
  const [totalPages, setTotalPages] = useState<number>(book.sayfaSayisi || 1);
  const [scale, setScale] = useState<number>(1.3);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookmarksDropdownOpen, setBookmarksDropdownOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const inks = useLiveQuery(
    async () => {
      if (!book.id) return null;
      return await db.inks.get([book.id, currentPage]);
    },
    [book.id, currentPage]
  );

  const bookBookmarks = useLiveQuery(
    () => db.bookmarks.where('bookId').equals(book.id || '').toArray(),
    [book.id]
  ) || [];

  const {
    drawingEnabled, setDrawingEnabled,
    tool, setTool,
    penColor, setPenColor,
    penWidth, setPenWidth,
    canvasSize, setCanvasSize,
    drawingCanvasRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleClearPage
  } = useDrawing(book.id, currentPage, scale, inks);

  useEffect(() => {
    let active = true;
    async function loadPage() {
      if (!book.blob || !canvasRef.current) return;
      setLoading(true);
      const result = await renderPDFPage(book.blob, currentPage, canvasRef.current, scale);
      if (active && result) {
        setTotalPages(result.totalPages);
        setLoading(false);
      }
    }
    loadPage();
    return () => { active = false; };
  }, [book.blob, currentPage, scale]);

  useEffect(() => {
    if (book.id) {
      db.books.update(book.id, { kalinanSayfa: currentPage });
    }
  }, [currentPage, book.id]);

  useEffect(() => {
    if (!loading && canvasRef.current && drawingCanvasRef.current) {
      const pdfWidth = canvasRef.current.width;
      const pdfHeight = canvasRef.current.height;
      drawingCanvasRef.current.width = pdfWidth;
      drawingCanvasRef.current.height = pdfHeight;
      setCanvasSize({ width: pdfWidth, height: pdfHeight });
    }
  }, [loading, currentPage, scale, setCanvasSize, drawingCanvasRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') {
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage(prev => Math.max(1, prev - 1));
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'k' || e.key === 'K') {
        setDrawingEnabled(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages, onClose, setDrawingEnabled]);

  const handleAddBookmark = async () => {
    const label = prompt('Ayraç için etiket girin:', `Sayfa ${currentPage}`);
    if (label === null) return;
    await db.bookmarks.add({
      id: crypto.randomUUID(),
      bookId: book.id || '',
      sayfa: currentPage,
      etiket: label.trim() || `Sayfa ${currentPage}`,
      eklenme: new Date()
    });
  };

  return (
    <div className="kp-reader-overlay">
      <div className="kp-reader-navbar">
        <div className="kp-reader-nav-left">
          <Button variant="secondary" onClick={onClose} title="Kapat">
            <X size={16} /> Kapat
          </Button>
          <div className="kp-reader-book-title-container">
            <span className="kp-reader-cat">{book.ders.toUpperCase()}</span>
            <span className="kp-reader-book-title">{book.ad}</span>
          </div>
        </div>

        <div className="kp-reader-nav-center">
          <Button variant="secondary" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>
            <ChevronLeft size={16} />
          </Button>
          <span className="kp-reader-pages-label">
            SAYFA <strong className="kp-lbl-mono">{currentPage}</strong> / <span className="kp-lbl-mono">{totalPages}</span>
          </span>
          <Button variant="secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
            <ChevronRight size={16} />
          </Button>
        </div>

        <div className="kp-reader-nav-right">
          <div className="kp-reader-nav-bookmarks-dropdown">
            <Button variant="secondary" onClick={() => setBookmarksDropdownOpen(!bookmarksDropdownOpen)}>
              <Bookmark size={16} /> Ayraçlar <ChevronDown size={12} />
            </Button>
            {bookmarksDropdownOpen && (
              <div className="kp-bookmarks-dropdown-menu">
                <div className="kp-dropdown-header">Kitap Ayraçları</div>
                <button className="kp-dropdown-item font-bold text-xs color-dosya" onClick={handleAddBookmark}>
                  + Bu Sayfayı İşaretle
                </button>
                {bookBookmarks.map(bm => (
                  <button key={bm.id} className="kp-dropdown-item" onClick={() => { setCurrentPage(bm.sayfa); setBookmarksDropdownOpen(false); }}>
                    <span className="kp-bookmark-page-badge">S. {bm.sayfa}</span>
                    <span className="kp-bookmark-label">{bm.etiket}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="secondary" onClick={() => setScale(s => Math.max(0.6, s - 0.15))} title="Uzaklaştır">
            <ZoomOut size={16} />
          </Button>
          <span className="kp-reader-scale-lbl">{Math.round(scale * 100)}%</span>
          <Button variant="secondary" onClick={() => setScale(s => Math.min(3.0, s + 0.15))} title="Yakınlaştır">
            <ZoomIn size={16} />
          </Button>
        </div>
      </div>

      <div className="kp-reader-workspace">
        {drawingEnabled && (
          <div className="kp-annotation-toolbar">
            <Button variant={tool === 'pen' ? 'primary' : 'secondary'} className={`kp-annotation-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')} title="Kalem Modu">
              <Edit2 size={16} />
            </Button>
            {tool === 'pen' && (
              <>
                <button className={`kp-annotation-btn ${penColor === '#A8271F' ? 'active' : ''}`} onClick={() => { setPenColor('#A8271F'); setPenWidth(2); }} title="Mühür Kırmızısı">
                  <div className="kp-color-dot red" />
                </button>
                <button className={`kp-annotation-btn ${penColor === '#2C4A6E' ? 'active' : ''}`} onClick={() => { setPenColor('#2C4A6E'); setPenWidth(2); }} title="Dosya Mavisi">
                  <div className="kp-color-dot blue" />
                </button>
                <button className={`kp-annotation-btn ${penColor === '#5A5E6B' ? 'active' : ''}`} onClick={() => { setPenColor('#5A5E6B'); setPenWidth(2.5); }} title="Kurşun Grisi">
                  <div className="kp-color-dot grey" />
                </button>
              </>
            )}
            <div className="kp-annotation-divider" />
            <Button variant={tool === 'highlighter' ? 'primary' : 'secondary'} className={`kp-annotation-btn ${tool === 'highlighter' ? 'active' : ''}`} onClick={() => setTool('highlighter')} title="Fosforlu Kalem">
              <Highlighter size={16} />
            </Button>
            <div className="kp-annotation-divider" />
            <Button variant={tool === 'eraser' ? 'primary' : 'secondary'} className={`kp-annotation-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')} title="Silgi (Vuruş Komple Siler)">
              <Trash2 size={16} />
            </Button>
            <div className="kp-annotation-divider" />
            <Button variant="secondary" className="kp-annotation-btn" onClick={handleClearPage} title="Sayfayı Temizle">
              <RotateCcw size={16} />
            </Button>
          </div>
        )}

        {loading && (
          <div className="kp-reader-loader">
            <Loader size={24} className="kp-spinner" />
            <span>Sayfa Hazırlanıyor...</span>
          </div>
        )}
        <div className="kp-canvas-wrapper" style={{ opacity: loading ? 0.4 : 1, position: 'relative' }}>
          <canvas ref={canvasRef} className="kp-reader-canvas" />
          <canvas
            ref={drawingCanvasRef}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              pointerEvents: drawingEnabled ? 'auto' : 'none',
              cursor: drawingEnabled ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </div>
      </div>

      <div className="kp-reader-statusbar">
        <span>Yön Tuşları (← →) ile sayfaları geçebilirsiniz · K kısayolu ile Çözüm Modunu açıp kapatabilirsiniz (Aktif: {drawingEnabled ? 'EVET' : 'HAYIR'})</span>
        <span>Ölçek: {scale.toFixed(2)}x</span>
      </div>
    </div>
  );
}
