import { useState, useEffect, useRef } from 'react';
import { Pen, Highlighter, Eraser, Undo2, Redo2, Bookmark, BookmarkCheck, X } from 'lucide-react';
import { type DrawConfig } from './useDrawingState';

interface ToolbarProps {
  config: DrawConfig;
  onChangeConfig: (cfg: Partial<DrawConfig>) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onClose: () => void;
}

export default function AnnotationToolbar({
  config,
  onChangeConfig,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isBookmarked,
  onToggleBookmark,
  onClose
}: ToolbarProps) {
  const [isFaded, setIsFaded] = useState(false);
  const timerRef = useRef<number | null>(null);

  const resetFadeTimer = () => {
    setIsFaded(false);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setIsFaded(true);
    }, 4000);
  };

  useEffect(() => {
    resetFadeTimer();
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [config.tool, config.color, config.size]);

  const handleMouseEnter = () => {
    setIsFaded(false);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    resetFadeTimer();
  };

  return (
    <div
      className={`kp-annotation-toolbar-v3 ${isFaded ? 'faded' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseEnter}
    >
      {/* Kalem */}
      <button
        type="button"
        title="Kalem"
        className={`kp-annotation-btn-v3 ${config.tool === 'pen' ? 'active' : ''}`}
        onClick={() => onChangeConfig({ tool: 'pen' })}
      >
        <Pen size={18} />
      </button>

      {/* Fosforlu Kalem */}
      <button
        type="button"
        title="Fosforlu Kalem"
        className={`kp-annotation-btn-v3 ${config.tool === 'highlighter' ? 'active' : ''}`}
        onClick={() => onChangeConfig({ tool: 'highlighter' })}
      >
        <Highlighter size={18} />
      </button>

      {/* Silgi */}
      <button
        type="button"
        title="Vuruş Silgisi"
        className={`kp-annotation-btn-v3 ${config.tool === 'eraser' ? 'active' : ''}`}
        onClick={() => onChangeConfig({ tool: 'eraser' })}
      >
        <Eraser size={18} />
      </button>

      <hr style={{ margin: '4px 6px', border: 'none', borderTop: '1px solid var(--line)' }} />

      {/* Colors (Pen colors; highlighter has fixed yellow) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', margin: '4px 0' }}>
        <button
          type="button"
          title="Mühür Kırmızısı"
          className={`kp-color-selector-dot stamp ${config.color === '#e53e3e' ? 'active' : ''}`}
          onClick={() => onChangeConfig({ color: '#e53e3e' })}
        />
        <button
          type="button"
          title="Dosya Mavisi"
          className={`kp-color-selector-dot dosya ${config.color === '#2b6cb0' ? 'active' : ''}`}
          onClick={() => onChangeConfig({ color: '#2b6cb0' })}
        />
        <button
          type="button"
          title="Kurşun Grisi"
          className={`kp-color-selector-dot ink ${config.color === '#4a5568' ? 'active' : ''}`}
          onClick={() => onChangeConfig({ color: '#4a5568' })}
        />
      </div>

      <hr style={{ margin: '4px 6px', border: 'none', borderTop: '1px solid var(--line)' }} />

      {/* Thickness / Sizes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', margin: '4px 0' }}>
        <button
          type="button"
          title="İnce Uçlu"
          className="kp-annotation-btn-v3"
          style={{ height: '24px' }}
          onClick={() => onChangeConfig({ size: config.tool === 'highlighter' ? 10 : 3 })}
        >
          <div
            className={`kp-size-selector-dot ${(config.size === 3 || config.size === 10) ? 'active' : ''}`}
            style={{ width: '6px', height: '6px' }}
          />
        </button>
        <button
          type="button"
          title="Kalın Uçlu"
          className="kp-annotation-btn-v3"
          style={{ height: '24px' }}
          onClick={() => onChangeConfig({ size: config.tool === 'highlighter' ? 24 : 8 })}
        >
          <div
            className={`kp-size-selector-dot ${(config.size === 8 || config.size === 24) ? 'active' : ''}`}
            style={{ width: '10px', height: '10px' }}
          />
        </button>
      </div>

      <hr style={{ margin: '4px 6px', border: 'none', borderTop: '1px solid var(--line)' }} />

      {/* Geri Al */}
      <button
        type="button"
        title="Geri Al (Ctrl+Z)"
        disabled={!canUndo}
        className="kp-annotation-btn-v3"
        onClick={onUndo}
      >
        <Undo2 size={18} />
      </button>

      {/* Yinele */}
      <button
        type="button"
        title="Yinele (Ctrl+Shift+Z)"
        disabled={!canRedo}
        className="kp-annotation-btn-v3"
        onClick={onRedo}
      >
        <Redo2 size={18} />
      </button>

      {/* Ayraç (Bookmark) */}
      <button
        type="button"
        title={isBookmarked ? 'Ayracı Kaldır' : 'Ayraç Ekle'}
        className="kp-annotation-btn-v3"
        onClick={onToggleBookmark}
      >
        {isBookmarked ? (
          <BookmarkCheck size={18} style={{ color: 'var(--stamp)' }} />
        ) : (
          <Bookmark size={18} />
        )}
      </button>

      <hr style={{ margin: '4px 6px', border: 'none', borderTop: '1px solid var(--line)' }} />

      {/* Kapat */}
      <button
        type="button"
        title="Kapat"
        className="kp-annotation-btn-v3"
        onClick={onClose}
        style={{ color: 'var(--stamp)' }}
      >
        <X size={18} />
      </button>
    </div>
  );
}
