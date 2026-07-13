import { useState, useEffect, useRef } from 'react';
import { db, type Book } from '../../db';
import { renderPDFPage } from '../../lib/pdf-thumbs';
import Button from '../../ui/Button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, X, Loader } from 'lucide-react';

interface PDFReaderProps {
  book: Book;
  onClose: () => void;
}

export default function PDFReader({ book, onClose }: PDFReaderProps) {
  const [currentPage, setCurrentPage] = useState<number>(book.kalinanSayfa || 1);
  const [totalPages, setTotalPages] = useState<number>(book.sayfaSayisi || 1);
  const [scale, setScale] = useState<number>(1.3);
  const [loading, setLoading] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load and render page
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

    return () => {
      active = false;
    };
  }, [book.blob, currentPage, scale]);

  // Save progress back to database on page change
  useEffect(() => {
    if (book.id) {
      db.books.update(book.id, { kalinanSayfa: currentPage });
    }
  }, [currentPage, book.id]);

  // Keyboard Navigation: arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevPage();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.15));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.6, prev - 0.15));
  };

  return (
    <div className="kp-reader-overlay">
      {/* Top Navbar */}
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

        {/* Page navigation */}
        <div className="kp-reader-nav-center">
          <Button variant="secondary" onClick={handlePrevPage} disabled={currentPage <= 1}>
            <ChevronLeft size={16} />
          </Button>
          <span className="kp-reader-pages-label">
            SAYFA <strong className="kp-lbl-mono">{currentPage}</strong> / <span className="kp-lbl-mono">{totalPages}</span>
          </span>
          <Button variant="secondary" onClick={handleNextPage} disabled={currentPage >= totalPages}>
            <ChevronRight size={16} />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="kp-reader-nav-right">
          <Button variant="secondary" onClick={handleZoomOut} title="Uzaklaştır">
            <ZoomOut size={16} />
          </Button>
          <span className="kp-reader-scale-lbl">{Math.round(scale * 100)}%</span>
          <Button variant="secondary" onClick={handleZoomIn} title="Yakınlaştır">
            <ZoomIn size={16} />
          </Button>
        </div>
      </div>

      {/* Reader Workspace */}
      <div className="kp-reader-workspace">
        {loading && (
          <div className="kp-reader-loader">
            <Loader size={24} className="kp-spinner" />
            <span>Sayfa Hazırlanıyor...</span>
          </div>
        )}
        <div className="kp-canvas-wrapper" style={{ opacity: loading ? 0.4 : 1 }}>
          <canvas ref={canvasRef} className="kp-reader-canvas" />
        </div>
      </div>

      {/* Bottom status bar info */}
      <div className="kp-reader-statusbar">
        <span>Yön Tuşları (← →) ile sayfaları geçebilirsiniz · ESC kapatır</span>
        <span>Çözünürlük Ölçeği: {scale.toFixed(2)}x</span>
      </div>
    </div>
  );
}
