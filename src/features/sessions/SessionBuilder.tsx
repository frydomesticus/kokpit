import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Book, type QuestionCrop } from '../../db';
import { useSessionGenerator } from './useSessionGenerator';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { BookOpen, Layers, Scissors, CheckCircle, AlertTriangle, Play } from 'lucide-react';

interface SessionBuilderProps {
  onOpenBook: (book: Book) => void;
}

export default function SessionBuilder({ onOpenBook }: SessionBuilderProps) {
  const [activeMode, setActiveMode] = useState<'sayfa' | 'soru'>('sayfa');
  
  // Database Queries
  const allBooks = useLiveQuery(() => db.books.toArray()) || [];
  const allCrops = useLiveQuery(() => db.questionCrops.toArray()) || [];
  const directorySetting = useLiveQuery(() => db.settings.get('directoryHandle'));
  const folderHandle = directorySetting?.value || null;

  // Filter books to exclude existing generated sessions
  const sourceBooks = useMemo(() => {
    return allBooks.filter(b => b.ders !== 'Oturumlar');
  }, [allBooks]);

  // Hook orchestration
  const {
    loading,
    progressText,
    skipped,
    generatedBook,
    clearGeneratedBook,
    buildSayfaKarmasi,
    buildSoruKarmasi
  } = useSessionGenerator();

  // Mode A: Sayfa Karması State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [pageRanges, setPageRanges] = useState<Record<string, string>>({}); // bookId -> rangeStr
  const [orderMode, setOrderMode] = useState<'round-robin' | 'shuffle'>('round-robin');
  const [captionEnabled, setCaptionEnabled] = useState(true);
  const [sayfaSessionName, setSayfaSessionName] = useState('');

  // Mode A Filtered Books
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return sourceBooks;
    const q = searchQuery.toLowerCase();
    return sourceBooks.filter(b => b.ad.toLowerCase().includes(q) || b.ders.toLowerCase().includes(q));
  }, [sourceBooks, searchQuery]);

  // Auto session name helpers
  const handleSelectBookToggle = (bookId: string, bookName: string) => {
    setSelectedBookIds(prev => {
      let next: string[];
      if (prev.includes(bookId)) {
        next = prev.filter(id => id !== bookId);
      } else {
        next = [...prev, bookId];
      }

      // Prefill session name based on selections
      if (next.length > 0) {
        const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
        const firstSelected = sourceBooks.find(b => b.id === next[0]);
        if (firstSelected) {
          setSayfaSessionName(`${firstSelected.ders} Karması - ${today}`);
        }
      }
      return next;
    });
  };

  const handleRangeChange = (bookId: string, value: string) => {
    setPageRanges(prev => ({ ...prev, [bookId]: value }));
  };

  const executeSayfaKarmasi = async () => {
    if (selectedBookIds.length === 0) {
      alert('Lütfen en az bir kaynak kitap seçin.');
      return;
    }

    const selections = selectedBookIds.map(id => {
      const book = sourceBooks.find(b => b.id === id)!;
      return {
        book,
        range: pageRanges[id] || `1-${book.sayfaSayisi}`
      };
    });

    try {
      await buildSayfaKarmasi(
        sayfaSessionName || 'Sayfa Karması',
        selections,
        orderMode,
        captionEnabled,
        folderHandle
      );
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // Mode B: Soru Karması State
  const [selectedDers, setSelectedDers] = useState('');
  const [selectedKonu, setSelectedKonu] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(20);
  const [soruSessionName, setSoruSessionName] = useState('');

  // Available filters from pool
  const dersList = useMemo(() => {
    return Array.from(new Set(allCrops.map(c => c.ders)));
  }, [allCrops]);

  const konuList = useMemo(() => {
    if (!selectedDers) return [];
    return Array.from(new Set(allCrops.filter(c => c.ders === selectedDers).map(c => c.konu)));
  }, [allCrops, selectedDers]);

  const cropSourcesList = useMemo(() => {
    if (!selectedDers) return [];
    const bookIds = Array.from(new Set(allCrops.filter(c => c.ders === selectedDers).map(c => c.bookId)));
    return sourceBooks.filter(b => bookIds.includes(b.id || ''));
  }, [allCrops, selectedDers, sourceBooks]);

  // Matching pool count
  const matchingCrops = useMemo(() => {
    if (!selectedDers) return [];
    return allCrops.filter(c => {
      if (c.ders !== selectedDers) return false;
      if (selectedKonu.length > 0 && !selectedKonu.includes(c.konu)) return false;
      if (selectedSources.length > 0 && !selectedSources.includes(c.bookId)) return false;
      return true;
    });
  }, [allCrops, selectedDers, selectedKonu, selectedSources]);

  const executeSoruKarmasi = async () => {
    if (!selectedDers) {
      alert('Lütfen bir ders seçin.');
      return;
    }

    try {
      const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      const name = soruSessionName.trim() || `${selectedDers} Soru Karması - ${today}`;
      
      await buildSoruKarmasi(
        name,
        matchingCrops,
        questionCount,
        selectedDers,
        folderHandle
      );
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleOpenGenerated = () => {
    if (generatedBook) {
      onOpenBook(generatedBook);
    }
  };

  return (
    <div className="kp-session-builder-container">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="kp-section-title">OTURUM ÜRETİCİ</h2>
        <p className="kp-section-subtitle">Kendi kaynak kitaplarından kişiselleştirilmiş yeni test PDF'leri oluştur.</p>
      </div>

      {/* Mode Switcher */}
      <div className="kp-session-segment-control">
        <button
          className={`kp-session-segment-btn ${activeMode === 'sayfa' ? 'active' : ''}`}
          onClick={() => { setActiveMode('sayfa'); clearGeneratedBook(); }}
        >
          <Layers size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
          Sayfa Karması
        </button>
        <button
          className={`kp-session-segment-btn ${activeMode === 'soru' ? 'active' : ''}`}
          onClick={() => { setActiveMode('soru'); clearGeneratedBook(); }}
        >
          <Scissors size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
          Soru Karması ({allCrops.length})
        </button>
      </div>

      {/* Done State */}
      {generatedBook && (
        <Card className="kp-session-card" style={{ borderColor: 'var(--ok)', backgroundColor: 'rgba(46, 107, 68, 0.05)' }}>
          <div className="text-center py-4">
            <CheckCircle size={48} className="text-ok mb-2" style={{ margin: '0 auto' }} />
            <h4 style={{ fontSize: 16, fontWeight: 700 }}>Oturum Kitabı Hazırlandı!</h4>
            <p className="text-sm kp-lbl-soft mt-1">"{generatedBook.ad}" ismiyle kitaplığınıza eklendi.</p>
            {skipped.length > 0 && (
              <div className="mt-2 text-xs text-stamp" style={{ maxWidth: '400px', margin: '8px auto' }}>
                <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />
                Yüklenemediği için atlanan kaynaklar: {skipped.join(', ')}
              </div>
            )}
            <div className="mt-4">
              <Button variant="primary" onClick={handleOpenGenerated}>
                <BookOpen size={16} /> Rafta Aç ve Çözmeye Başla
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Mode A Form */}
      {activeMode === 'sayfa' && !generatedBook && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card className="kp-session-card">
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>1. Kaynak Kitapları Seçin</h4>
            
            {/* Search */}
            <div className="kp-session-field-group">
              <input
                type="text"
                placeholder="Kitaplıkta ara (ders veya ad)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Selection Grid */}
            <div className="kp-book-select-grid">
              {filteredBooks.map(book => {
                const isSelected = selectedBookIds.includes(book.id || '');
                return (
                  <div
                    key={book.id}
                    className={`kp-book-select-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectBookToggle(book.id || '', book.ad)}
                  >
                    <input type="checkbox" checked={isSelected} readOnly />
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span className="kp-book-select-label" title={book.ad}>{book.ad}</span>
                      <span style={{ fontSize: 10, opacity: 0.7 }}>{book.ders} · {book.sayfaSayisi} Sayfa</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {selectedBookIds.length > 0 && (
            <Card className="kp-session-card">
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>2. Sayfa Aralıkları ve İnce Ayarlar</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedBookIds.map(id => {
                  const book = sourceBooks.find(b => b.id === id)!;
                  return (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div className="text-xs font-bold truncate" title={book.ad}>{book.ad}</div>
                        <div className="text-2xs kp-lbl-soft">Maks: {book.sayfaSayisi} sayfa</div>
                      </div>
                      <div style={{ width: 160 }}>
                        <input
                          type="text"
                          placeholder={`Örn: 1-5, 12 (${book.sayfaSayisi})`}
                          value={pageRanges[id] || ''}
                          onChange={e => handleRangeChange(id, e.target.value)}
                          style={{ padding: '6px', fontSize: 12, border: '1px solid var(--line)', width: '100%' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="kp-annotation-divider" style={{ margin: '16px 0' }}></div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="kp-session-field-group">
                  <label>Karıştırma Düzeni</label>
                  <select value={orderMode} onChange={e => setOrderMode(e.target.value as any)}>
                    <option value="round-robin">Dönüşümlü (Sırayla 1-1)</option>
                    <option value="shuffle">Rastgele (Tümünü Karıştır)</option>
                  </select>
                </div>
                <div className="kp-session-field-group">
                  <label>Sayfa Altı Bilgisi</label>
                  <div style={{ display: 'flex', alignItems: 'center', height: '36px', gap: 8 }}>
                    <input
                      type="checkbox"
                      id="captionToggle"
                      checked={captionEnabled}
                      onChange={e => setCaptionEnabled(e.target.checked)}
                    />
                    <label htmlFor="captionToggle" style={{ margin: 0, fontWeight: 'normal', cursor: 'pointer' }}>
                      Kaynak adını sayfa altına yaz
                    </label>
                  </div>
                </div>
              </div>

              <div className="kp-session-field-group">
                <label>Oturum Adı</label>
                <input
                  type="text"
                  placeholder="Örn: Tarih Karması - 14 Tem"
                  value={sayfaSessionName}
                  onChange={e => setSayfaSessionName(e.target.value)}
                />
              </div>
            </Card>
          )}

          {selectedBookIds.length > 0 && !loading && (
            <Button variant="primary" size="large" onClick={executeSayfaKarmasi}>
              <Play size={16} /> Oturumu Üret
            </Button>
          )}
        </div>
      )}

      {/* Mode B Form */}
      {activeMode === 'soru' && !generatedBook && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card className="kp-session-card">
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>1. Soru Havuzu Filtreleri</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Ders Selection (Required) */}
              <div className="kp-session-field-group">
                <label>Ders Seçimi (Zorunlu)</label>
                <select value={selectedDers} onChange={e => { setSelectedDers(e.target.value); setSelectedKonu([]); setSelectedSources([]); }}>
                  <option value="">-- Ders Seçin --</option>
                  {dersList.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {selectedDers && (
                <>
                  {/* Konu Selection */}
                  <div className="kp-session-field-group">
                    <label>Konu Seçimi (İsteğe Bağlı)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: '80px', overflowY: 'auto', border: '1px solid var(--line)', padding: '6px' }}>
                      {konuList.length === 0 ? (
                        <span className="text-2xs kp-lbl-soft">Kesilmiş konu bulunmuyor.</span>
                      ) : (
                        konuList.map(k => {
                          const isSel = selectedKonu.includes(k);
                          return (
                            <button
                              key={k}
                              type="button"
                              className={`kp-tab-btn`}
                              style={{
                                padding: '3px 8px',
                                fontSize: '10px',
                                border: '1px solid var(--line)',
                                background: isSel ? 'var(--ink)' : 'transparent',
                                color: isSel ? 'var(--paper)' : 'var(--ink)'
                              }}
                              onClick={() => {
                                setSelectedKonu(prev =>
                                  prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]
                                );
                              }}
                            >
                              {k}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Kaynak Seçimi */}
                  <div className="kp-session-field-group">
                    <label>Kaynak Kitap Seçimi (İsteğe Bağlı)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: '80px', overflowY: 'auto', border: '1px solid var(--line)', padding: '6px' }}>
                      {cropSourcesList.map(b => {
                        const isSel = selectedSources.includes(b.id || '');
                        return (
                          <button
                            key={b.id}
                            type="button"
                            className={`kp-tab-btn`}
                            style={{
                              padding: '3px 8px',
                              fontSize: '10px',
                              border: '1px solid var(--line)',
                              background: isSel ? 'var(--ink)' : 'transparent',
                              color: isSel ? 'var(--paper)' : 'var(--ink)'
                            }}
                            onClick={() => {
                              setSelectedSources(prev =>
                                prev.includes(b.id || '') ? prev.filter(x => x !== b.id) : [...prev, b.id || '']
                              );
                            }}
                          >
                            {b.ad}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {selectedDers && (
            <Card className="kp-session-card">
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>2. Soru Sayısı ve Oturum Bilgileri</h4>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="text-xs font-bold">Havuzdaki Toplam Uyumlu Soru:</span>
                <span className="kp-badge" style={{ backgroundColor: 'var(--ok)', color: '#fff', fontSize: '12px' }}>
                  {matchingCrops.length}
                </span>
              </div>

              <div className="kp-session-field-group">
                <label>İstenen Soru Sayısı (Maks: {matchingCrops.length})</label>
                <input
                  type="number"
                  min={1}
                  max={matchingCrops.length}
                  value={questionCount}
                  onChange={e => setQuestionCount(Math.min(matchingCrops.length, parseInt(e.target.value) || 1))}
                />
              </div>

              <div className="kp-session-field-group">
                <label>Oturum Adı</label>
                <input
                  type="text"
                  placeholder="Örn: Tarih Soru Karması - 14 Tem"
                  value={soruSessionName}
                  onChange={e => setSoruSessionName(e.target.value)}
                />
              </div>
            </Card>
          )}

          {selectedDers && matchingCrops.length > 0 && !loading && (
            <Button variant="primary" size="large" onClick={executeSoruKarmasi}>
              <Play size={16} /> Oturumu Üret
            </Button>
          )}
        </div>
      )}

      {/* Loading Progress State */}
      {loading && (
        <Card className="kp-session-progress">
          <div className="kp-session-progress-spinner"></div>
          <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{progressText}</span>
        </Card>
      )}
    </div>
  );
}
