import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MapFeature } from '../../db';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import { Map, BookOpen, HelpCircle, Check, Award, Save, RefreshCw } from 'lucide-react';

export default function AtlasAcademy() {
  const [activeCategory, setActiveCategory] = useState<'daglar' | 'akarsular' | 'platolar'>('daglar');
  const [mode, setMode] = useState<'study' | 'quiz'>('study');
  const [selectedFeature, setSelectedFeature] = useState<MapFeature | null>(null);
  
  // Quiz states
  const [quizFeatures, setQuizFeatures] = useState<MapFeature[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Live query for features in active category
  const features = useLiveQuery(
    () => db.mapFeatures.where('category').equals(activeCategory).toArray(),
    [activeCategory]
  ) || [];

  // Reset selected feature when category changes
  useEffect(() => {
    setSelectedFeature(null);
    setQuizFeedback(null);
  }, [activeCategory, mode]);

  // Quiz Setup
  const startQuiz = () => {
    if (features.length === 0) return;
    const shuffled = [...features].sort(() => 0.5 - Math.random());
    setQuizFeatures(shuffled);
    setCurrentIndex(0);
    setScore({ correct: 0, total: 0 });
    setQuizFeedback(null);
    setSelectedFeature(null);
    setMode('quiz');
  };

  const handleFeatureClick = (feat: MapFeature) => {
    if (mode === 'study') {
      setSelectedFeature(feat);
    } else if (mode === 'quiz' && quizFeedback === null) {
      const target = quizFeatures[currentIndex];
      if (feat.id === target.id) {
        setQuizFeedback('correct');
        setScore(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }));
      } else {
        setQuizFeedback('wrong');
        setScore(prev => ({ ...prev, total: prev.total + 1 }));
      }
      setSelectedFeature(target); // Reveal details of target
    }
  };

  const nextQuizQuestion = () => {
    setQuizFeedback(null);
    setSelectedFeature(null);
    if (currentIndex + 1 < quizFeatures.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      alert(`Quiz Bitti! Skorunuz: ${score.correct} / ${score.total}`);
      setMode('study');
    }
  };

  const handleUpdateNote = async (id: string, note: string) => {
    await db.mapFeatures.update(id, { kullaniciNotu: note });
    if (selectedFeature && selectedFeature.id === id) {
      setSelectedFeature(prev => prev ? { ...prev, kullaniciNotu: note } : null);
    }
  };

  const handleToggleCompleted = async (feat: MapFeature) => {
    const val = !feat.yapildi;
    await db.mapFeatures.update(feat.id, { yapildi: val });
    setSelectedFeature(prev => prev ? { ...prev, yapildi: val } : null);
  };

  const completedCount = features.filter(f => f.yapildi).length;

  return (
    <div className="kp-atlas-layout">
      <div className="kp-section-header">
        <div>
          <h2 className="kp-section-title">COĞRAFYA İNTERAKTİF ATLAS</h2>
          <p className="kp-section-subtitle">Türkiye Fiziksel Coğrafyası - KPSS Görsel Hafıza Paneli</p>
        </div>
        <div className="flex gap-2">
          <Button variant={mode === 'study' ? 'primary' : 'secondary'} onClick={() => setMode('study')}>
            <BookOpen size={16} /> Keşif Modu
          </Button>
          <Button variant={mode === 'quiz' ? 'primary' : 'secondary'} onClick={startQuiz}>
            <HelpCircle size={16} /> Quiz Modu
          </Button>
        </div>
      </div>

      {/* Categories navbar */}
      <div className="kp-tab-bar sub-tabs" style={{ marginBottom: '16px' }}>
        {(['daglar', 'akarsular', 'platolar'] as const).map(cat => (
          <button
            key={cat}
            className={`kp-tab-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            <span>{cat === 'daglar' ? '🏔️ DAĞLAR' : cat === 'akarsular' ? '🌊 AKARSULAR' : '⛰️ PLATOLAR'}</span>
          </button>
        ))}
      </div>

      <div className="kp-atlas-main-grid">
        {/* Turkey SVG Map Card */}
        <Card className="kp-map-card" header={
          <div className="kp-card-header-mono flex justify-between w-full">
            <span>TÜRKİYE FİZİKSEL KATMANI ({activeCategory.toUpperCase()})</span>
            {mode === 'study' ? (
              <span className="text-xs">Çalışıldı: {completedCount}/{features.length}</span>
            ) : (
              <span className="text-xs">Soru: {currentIndex + 1}/{quizFeatures.length} | Skor: {score.correct}/{score.total}</span>
            )}
          </div>
        }>
          {mode === 'quiz' && quizFeatures[currentIndex] && (
            <div className="kp-quiz-banner">
              Hedef Noktayı Haritada Bulun: <strong>{quizFeatures[currentIndex].ad}</strong>
              {quizFeedback === 'correct' && <span className="kp-quiz-badge correct">✓ Doğru!</span>}
              {quizFeedback === 'wrong' && <span className="kp-quiz-badge wrong">✗ Yanlış!</span>}
            </div>
          )}

          <div className="kp-map-container" style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
            <svg viewBox="0 0 1000 450" className="kp-turkey-map" style={{ width: '100%', height: 'auto', backgroundColor: '#D3ECE9', border: '2px solid var(--ink)' }}>
              {/* Turkey outer border path */}
              <path
                d="M 80 80 L 140 100 L 150 115 L 220 100 L 350 90 L 480 80 L 520 60 L 530 80 L 650 95 L 780 110 L 880 130 L 920 120 L 940 160 L 920 220 L 960 250 L 950 300 L 880 320 L 820 350 L 740 340 L 620 330 L 600 380 L 585 380 L 580 340 L 520 340 L 440 350 L 360 360 L 320 310 L 270 330 L 200 340 L 180 310 L 190 270 L 160 240 L 180 200 L 160 160 L 110 140 L 80 130 L 60 110 Z"
                fill="#F4F0E6"
                stroke="var(--ink)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              {/* Lakes */}
              <path d="M 840 230 C 850 225, 870 230, 875 240 C 870 250, 850 255, 840 245 Z" fill="#D3ECE9" stroke="var(--ink)" strokeWidth="1" />
              <path d="M 450 220 C 460 210, 480 225, 475 240 C 460 250, 445 240, 450 220 Z" fill="#D3ECE9" stroke="var(--ink)" strokeWidth="1" />

              {/* Akarsu paths when category is active */}
              {activeCategory === 'akarsular' && (
                <>
                  <path d="M 680 230 Q 560 250 510 210 T 560 140 T 525 98" fill="none" stroke="#2C4A6E" strokeWidth="3" />
                  <path d="M 780 200 Q 700 220 680 260 T 730 330" fill="none" stroke="#2C4A6E" strokeWidth="3" />
                  <path d="M 800 240 Q 800 270 820 280 T 890 325" fill="none" stroke="#2C4A6E" strokeWidth="2.5" />
                  <path d="M 70 80 L 60 110 L 75 130" fill="none" stroke="#2C4A6E" strokeWidth="2.5" />
                </>
              )}

              {/* Dynamic Feature Markers */}
              {features.map(feat => {
                const isSelected = selectedFeature?.id === feat.id;
                const markerColor = feat.yapildi ? 'var(--dosya)' : 'var(--stamp)';
                return (
                  <g key={feat.id} style={{ cursor: 'pointer' }} onClick={() => handleFeatureClick(feat)}>
                    <circle
                      cx={feat.x}
                      cy={feat.y}
                      r={isSelected ? 10 : 7}
                      fill={markerColor}
                      stroke="var(--paper)"
                      strokeWidth="1.5"
                      className={isSelected ? 'kp-pulse' : ''}
                    />
                    <text
                      x={feat.x}
                      y={feat.y - 12}
                      textAnchor="middle"
                      className="kp-lbl-mono font-bold"
                      style={{ fontSize: '10px', fill: 'var(--ink)', pointerEvents: 'none', filter: 'drop-shadow(1px 1px 0px var(--paper))' }}
                    >
                      {mode === 'study' ? feat.ad : ''}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </Card>

        {/* Feature Detail Sidebar */}
        <Card className="kp-atlas-sidebar" header={<div className="kp-card-header-mono">BİLGİ VE ANALİZ NOTLARI</div>}>
          {selectedFeature ? (
            <div className="kp-feature-details">
              <div className="flex justify-between items-start">
                <h3 className="kp-book-title-display" style={{ margin: 0 }}>{selectedFeature.ad}</h3>
                <Badge variant={selectedFeature.yapildi ? 'ok' : 'stamp'}>
                  {selectedFeature.yapildi ? 'ÇALIŞILDI' : 'YENİ'}
                </Badge>
              </div>
              <p className="text-sm mt-2">{selectedFeature.detay}</p>

              <div className="kp-projection-widget on-time mt-4">
                <span className="kp-projection-header">KPSS EĞİTMEN NOTU</span>
                <p className="kp-projection-text">{selectedFeature.kpssNotu}</p>
              </div>

              {mode === 'study' ? (
                <>
                  <div className="kp-form-group mt-4">
                    <label>Özel Hafıza Notunuz / Şifreniz</label>
                    <textarea
                      rows={3}
                      value={selectedFeature.kullaniciNotu || ''}
                      placeholder="Buraya kendi şifrelemelerinizi, kodlamalarınızı yazabilirsiniz..."
                      onChange={e => handleUpdateNote(selectedFeature.id, e.target.value)}
                    />
                  </div>
                  <Button variant="secondary" className="w-full mt-2" onClick={() => handleToggleCompleted(selectedFeature)}>
                    <Check size={14} /> {selectedFeature.yapildi ? 'Çalışılmadı Olarak İşaretle' : 'Çalışıldı Olarak İşaretle'}
                  </Button>
                </>
              ) : (
                quizFeedback !== null && (
                  <Button variant="stamp" className="w-full mt-4" onClick={nextQuizQuestion}>
                    Sıradaki Soru <RefreshCw size={14} className="ml-1" />
                  </Button>
                )
              )}
            </div>
          ) : (
            <p className="kp-lbl-soft italic text-center">
              {mode === 'study' ? 'Harita üzerinde tıklayarak noktalar hakkında detayları inceleyin.' : 'Doğru noktayı bulmak için haritadaki marker’lardan birine tıklayın.'}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
