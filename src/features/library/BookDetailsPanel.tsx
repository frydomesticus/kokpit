import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Book } from '../../db';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import { Edit2, Trash2, Check, BookOpen } from 'lucide-react';

const DERS_LER = ['Türkçe', 'Matematik', 'Tarih', 'Coğrafya', 'Vatandaşlık', 'Denemeler'];

interface BookDetailsPanelProps {
  book: Book;
  dailyPageRate: number;
  examDate: Date;
  onOpenReader: (book: Book, openAtPage?: number) => void;
  onClose: () => void;
}

export default function BookDetailsPanel({
  book,
  dailyPageRate,
  examDate,
  onOpenReader,
  onClose,
}: BookDetailsPanelProps) {
  const [editMode, setEditMode] = useState(false);
  const [editAd, setEditAd] = useState(book.ad);
  const [editDers, setEditDers] = useState(book.ders);
  const [editKalinanSayfa, setEditKalinanSayfa] = useState(book.kalinanSayfa);
  const [editSayfaSayisi, setEditSayfaSayisi] = useState(book.sayfaSayisi);

  const bookmarks = useLiveQuery(
    () => db.bookmarks.where('bookId').equals(book.id || '').toArray(),
    [book.id]
  ) || [];

  const bookCrops = useLiveQuery(
    () => db.questionCrops.where('bookId').equals(book.id || '').toArray(),
    [book.id]
  ) || [];
  const cropCount = bookCrops.length;

  // Sync edits when selected book changes
  useEffect(() => {
    setEditAd(book.ad);
    setEditDers(book.ders);
    setEditKalinanSayfa(book.kalinanSayfa);
    setEditSayfaSayisi(book.sayfaSayisi);
    setEditMode(false);
  }, [book]);

  const handleDeleteBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bu ayracı silmek istediğinize emin misiniz?')) {
      await db.bookmarks.delete(id);
    }
  };

  const handleDeleteBook = async () => {
    if (confirm('Bu kitabı kitaplığınızdan silmek istediğinize emin misiniz?')) {
      await db.books.delete(book.id!);
      onClose();
    }
  };

  const handleSaveEdit = async () => {
    if (!book.id) return;
    const kalinan = Math.min(Math.max(1, editKalinanSayfa), editSayfaSayisi);

    await db.books.update(book.id, {
      ad: editAd,
      ders: editDers,
      kalinanSayfa: kalinan,
      sayfaSayisi: editSayfaSayisi,
    });
    setEditMode(false);
  };

  // Projection math
  const remainingPages = Math.max(0, book.sayfaSayisi - book.kalinanSayfa);
  const daysToFinish = dailyPageRate > 0 ? Math.ceil(remainingPages / dailyPageRate) : 0;
  
  const now = new Date();
  const diffMs = examDate.getTime() - now.getTime();
  const daysToExam = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  
  const margin = daysToExam - daysToFinish;
  const isLate = margin < 0;

  return (
    <Card className="kp-book-details-panel">
      <div className="kp-details-header">
        <Badge variant="dosya">{book.ders.toUpperCase()}</Badge>
        <div className="kp-details-actions">
          <Button variant="secondary" onClick={() => setEditMode(true)} title="Düzenle" disabled={editMode}>
            <Edit2 size={14} />
          </Button>
          <Button variant="danger" onClick={handleDeleteBook} title="Sil">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {editMode ? (
        <div className="kp-book-edit-form">
          <div className="kp-form-group">
            <label>Kitap Adı</label>
            <input type="text" value={editAd} onChange={e => setEditAd(e.target.value)} />
          </div>
          <div className="kp-form-group">
            <label>Ders Kategorisi</label>
            <select value={editDers} onChange={e => setEditDers(e.target.value)}>
              {DERS_LER.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="kp-form-group-row">
            <div className="kp-form-group">
              <label>Kalan/Kalınalan Sayfa</label>
              <input type="number" min={1} value={editKalinanSayfa} onChange={e => setEditKalinanSayfa(parseInt(e.target.value) || 1)} />
            </div>
            <div className="kp-form-group">
              <label>Toplam Sayfa</label>
              <input type="number" min={1} value={editSayfaSayisi} onChange={e => setEditSayfaSayisi(parseInt(e.target.value) || 100)} />
            </div>
          </div>
          <div className="kp-form-buttons">
            <Button variant="secondary" onClick={() => setEditMode(false)}>Vazgeç</Button>
            <Button variant="primary" onClick={handleSaveEdit}>
              <Check size={14} /> Kaydet
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="kp-book-info">
            {book.thumbDataUrl ? (
              <img src={book.thumbDataUrl} alt="Kapak" className="kp-book-details-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="kp-book-details-cover-fallback" style={{ backgroundColor: book.renk }}>
                <span>PDF</span>
              </div>
            )}
            
            <h3 className="kp-book-title-display">{book.ad}</h3>
            <p className="kp-book-filename-display">Dosya: {book.dosyaAdi}</p>
          </div>

          <div className="kp-book-progress-stats">
            <div className="kp-progress-stat-line">
              <span className="kp-lbl-soft">İLERLEME DERECESİ</span>
              <span className="kp-lbl-mono font-bold">
                {Math.round((book.kalinanSayfa / book.sayfaSayisi) * 100)}%
              </span>
            </div>
            <div className="kp-progress-bar-bg">
              <div
                className="kp-progress-bar-fill"
                style={{ width: `${(book.kalinanSayfa / book.sayfaSayisi) * 100}%` }}
              />
            </div>
            <div className="kp-progress-pages-detail">
              <span>{book.kalinanSayfa}. sayfadasınız</span>
              <span>Toplam {book.sayfaSayisi} sayfa</span>
            </div>
            {cropCount > 0 && (
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--stamp)', marginTop: '8px', textAlign: 'center' }}>
                Bu kitaptan kesilmiş {cropCount} soru bulunuyor.
              </div>
            )}
          </div>

          {/* Projection Widget */}
          <div className={`kp-projection-widget ${isLate ? 'late' : 'on-time'}`}>
            <span className="kp-projection-header">LİNEER BİTİŞ ÖNGÖRÜSÜ</span>
            <p className="kp-projection-text">
              Günde <strong>{dailyPageRate} sayfa</strong> tempoyla kalan <strong>{remainingPages} sayfa</strong>,{' '}
              <strong>{daysToFinish} günde</strong> tamamlanır.
            </p>
            {isLate ? (
              <div className="kp-projection-alert">
                Sınava {daysToExam} gün var. Bu tempoyla sınavdan{' '}
                <strong className="text-stamp">{Math.abs(margin)} gün sonra</strong> bitiyor! Tempoyu artırın.
              </div>
            ) : (
              <div className="kp-projection-ok">
                Sınava {daysToExam} gün var. Sınavdan{' '}
                <strong>{margin} gün önce</strong> bitiyor (Güvenli Marj).
              </div>
            )}
          </div>

          {/* Bookmarks widget */}
          <div className="kp-bookmarks-panel">
            <div className="kp-bookmarks-title">Kitap Ayraçları ({bookmarks.length})</div>
            {bookmarks.length === 0 ? (
              <p className="text-xs kp-lbl-soft italic">Eklenmiş ayraç bulunmuyor.</p>
            ) : (
              <div className="kp-bookmarks-list">
                {bookmarks.map((bm) => (
                  <div key={bm.id} className="kp-bookmark-row">
                    <div
                      className="kp-bookmark-clickable"
                      onClick={() => onOpenReader(book, bm.page)}
                    >
                      <span className="kp-bookmark-page-badge">S. {bm.page}</span>
                      <span className="kp-bookmark-label" title={bm.label}>{bm.label}</span>
                    </div>
                    <button
                      className="kp-bookmark-delete-btn"
                      onClick={(e) => handleDeleteBookmark(bm.id!, e)}
                      title="Ayracı Sil"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button variant="stamp" className="w-full mt-4" onClick={() => onOpenReader(book)}>
            <BookOpen size={16} /> Kitabı Oku
          </Button>
        </>
      )}
    </Card>
  );
}
