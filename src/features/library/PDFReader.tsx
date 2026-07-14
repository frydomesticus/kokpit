import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Book } from '../../db';
import { renderPDFPage } from '../../lib/pdf-thumbs';
import { useDrawingState } from './useDrawingState';
import { useTouchNavigation } from './useTouchNavigation';
import AnnotationToolbar from './AnnotationToolbar';
import { drawStrokeOnContext } from '../../lib/drawing-utils';
import Button from '../../ui/Button';
import { ChevronLeft, ChevronRight, X, Loader, Bookmark, ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';

interface PDFReaderProps {
  book: Book;
  onClose: () => void;
}

export default function PDFReader({ book, onClose }: PDFReaderProps) {
  const [currentPage, setCurrentPage] = useState<number>((book as any).initialPage || book.kalinanSayfa || 1);
  const [totalPages, setTotalPages] = useState<number>(book.sayfaSayisi || 1);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookmarksDropdownOpen, setBookmarksDropdownOpen] = useState(false);
  const [drawingEnabled, setDrawingEnabled] = useState<boolean>(true);

  // Zoom & Translation State for touch/wheel
  const [zoom, setZoom] = useState<number>(1.3);
  const [translateX, setTranslateX] = useState<number>(0);
  const [translateY, setTranslateY] = useState<number>(0);

  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dryCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const drawingState = useDrawingState(book.id || '', currentPage, zoom);

  const bookBookmarks = useLiveQuery(
    () => db.bookmarks.where('bookId').equals(book.id || '').toArray(),
    [book.id]
  ) || [];

  useTouchNavigation(containerRef, {
    zoom,
    setZoom,
    translateX,
    setTranslateX,
    translateY,
    setTranslateY,
    onNextPage: () => setCurrentPage(p => Math.min(totalPages, p + 1)),
    onPrevPage: () => setCurrentPage(p => Math.max(1, p - 1))
  });

  // Render PDF Baseline
  useEffect(() => {
    let active = true;
    async function loadPage() {
      if (!book.blob || !pdfCanvasRef.current) return;
      setLoading(true);
      const result = await renderPDFPage(book.blob, currentPage, pdfCanvasRef.current, 1.0);
      if (active && result) {
        setTotalPages(result.totalPages);
        setLoading(false);
      }
    }
    loadPage();
    return () => { active = false; };
  }, [book.blob, currentPage]);

  // Sync KalinanSayfa
  useEffect(() => {
    if (book.id) {
      db.books.update(book.id, { kalinanSayfa: currentPage });
    }
  }, [currentPage, book.id]);

  // Setup Canvas Dimensions (DPR adjusted) and Draw Dry Ink
  const redrawDryInk = () => {
    const canvas = dryCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of drawingState.strokes) {
      drawStrokeOnContext(ctx, stroke, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    const pdf = pdfCanvasRef.current;
    const dry = dryCanvasRef.current;
    const wet = wetCanvasRef.current;
    if (!pdf || !dry || !wet || loading) return;

    const dpr = window.devicePixelRatio || 1;
    const width = pdf.width;
    const height = pdf.height;

    dry.width = width * dpr;
    dry.height = height * dpr;
    wet.width = width * dpr;
    wet.height = height * dpr;

    redrawDryInk();
  }, [loading, currentPage, drawingState.strokes]);

  // Keyboard Shortcuts (Arrow keys & Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        drawingState.redo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        drawingState.undo();
      } else if (e.key === 'ArrowRight') {
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage(prev => Math.max(1, prev - 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages, drawingState, onClose]);

  const handleToggleBookmark = async () => {
    const existing = bookBookmarks.find(bm => bm.page === currentPage);
    if (existing) {
      await db.bookmarks.delete(existing.id!);
    } else {
      const label = prompt('Ayraç için etiket girin:', `Sayfa ${currentPage}`);
      if (label === null) return;
      await db.bookmarks.add({
        id: crypto.randomUUID(),
        bookId: book.id || '',
        page: currentPage,
        label: label.trim() || `Sayfa ${currentPage}`,
        created: new Date()
      });
    }
  };

  const isPageBookmarked = bookBookmarks.some(bm => bm.page === currentPage);

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
                <button className="kp-dropdown-item font-bold text-xs color-dosya" onClick={handleToggleBookmark}>
                  + Bu Sayfayı İşaretle
                </button>
                {bookBookmarks.map(bm => (
                  <button key={bm.id} className="kp-dropdown-item" onClick={() => { setCurrentPage(bm.page); setBookmarksDropdownOpen(false); }}>
                    <span className="kp-bookmark-page-badge">S. {bm.page}</span>
                    <span className="kp-bookmark-label">{bm.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="secondary" onClick={() => setZoom(s => Math.max(0.5, s - 0.15))} title="Uzaklaştır">
            <ZoomOut size={16} />
          </Button>
          <span className="kp-reader-scale-lbl">{Math.round(zoom * 100)}%</span>
          <Button variant="secondary" onClick={() => setZoom(s => Math.min(4.0, s + 0.15))} title="Yakınlaştır">
            <ZoomIn size={16} />
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="kp-reader-workspace">
        {drawingEnabled && (
          <AnnotationToolbar
            config={drawingState.config}
            onChangeConfig={drawingState.updateConfig}
            onUndo={drawingState.undo}
            onRedo={drawingState.redo}
            canUndo={drawingState.canUndo}
            canRedo={drawingState.canRedo}
            isBookmarked={isPageBookmarked}
            onToggleBookmark={handleToggleBookmark}
            onClose={onClose}
          />
        )}

        {loading && (
          <div className="kp-reader-loader">
            <Loader size={24} className="kp-spinner" />
            <span>Sayfa Hazırlanıyor...</span>
          </div>
        )}

        <div
          className="kp-page-container"
          style={{
            opacity: loading ? 0.4 : 1,
            transform: `translate(${translateX}px, ${translateY}px) scale(${zoom})`
          }}
        >
          <canvas ref={pdfCanvasRef} className="kp-reader-canvas" />
          <canvas ref={dryCanvasRef} className="kp-canvas-dry-ink" />
          <canvas
            ref={wetCanvasRef}
            className="kp-canvas-wet-ink"
            {...drawingState.pointerHandlers}
          />
          {isPageBookmarked && <div className="kp-bookmark-ribbon" />}
        </div>
      </div>

      <div className="kp-reader-statusbar">
        <span>Yön Tuşları (← →) ile sayfaları geçebilirsiniz · Dokunmatik sürükleme ile gezinebilir, kıstırarak yakınlaştırabilirsiniz.</span>
        <span>Ölçek: {zoom.toFixed(2)}x</span>
      </div>
    </div>
  );
}
