import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Exam, type ExamSubject } from '../../db';
import { calculateNet, calculateTotalNet } from '../../lib/net';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Card from '../../ui/Card';
import EmptyState from '../../ui/EmptyState';
import ExamChart from './ExamChart';
import { Plus, Trash2, Edit2, Calendar, BookOpen, AlertCircle, Save, Check } from 'lucide-react';

const DEFAULTS = [
  { ders: 'Türkçe', max: 30 },
  { ders: 'Matematik', max: 30 },
  { ders: 'Tarih', max: 27 },
  { ders: 'Coğrafya', max: 18 },
  { ders: 'Vatandaşlık', max: 9 },
  { ders: 'Güncel', max: 6 }
];

export default function ExamDefteri() {
  const exams = useLiveQuery(() => db.exams.toArray()) || [];
  const targetNetSetting = useLiveQuery(() => db.settings.get('targetNet'));
  const targetNet = targetNetSetting?.value || 85;

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form States
  const [ad, setAd] = useState('');
  const [tarih, setTarih] = useState(new Date().toISOString().substring(0, 10));
  const [not, setNot] = useState('');
  
  // Subject results
  const [subjects, setSubjects] = useState<Record<string, { d: number; y: number }>>(
    DEFAULTS.reduce((acc, curr) => {
      acc[curr.ders] = { d: 0, y: 0 };
      return acc;
    }, {} as Record<string, { d: number; y: number }>)
  );

  const handleSubjectChange = (ders: string, type: 'd' | 'y', value: number) => {
    const maxVal = DEFAULTS.find(x => x.ders === ders)?.max || 30;
    const clamped = Math.min(Math.max(0, value), maxVal);
    
    setSubjects(prev => {
      const currentSub = { ...prev[ders] };
      currentSub[type] = clamped;

      // Validate sum doesn't exceed max questions
      const totalEntered = type === 'd' ? clamped + currentSub.y : currentSub.d + clamped;
      if (totalEntered > maxVal) {
        if (type === 'd') {
          currentSub.y = maxVal - clamped;
        } else {
          currentSub.d = maxVal - clamped;
        }
      }

      return {
        ...prev,
        [ders]: currentSub
      };
    });
  };

  // Compute live local net total
  const currentTotalNet = Object.entries(subjects).reduce((acc, [ders, val]) => {
    return acc + ((val as any).d - (val as any).y * 0.25);
  }, 0);

  const handleOpenNewForm = () => {
    setEditingId(null);
    setAd(`Deneme Sınavı #${exams.length + 1}`);
    setTarih(new Date().toISOString().substring(0, 10));
    setNot('');
    setSubjects(
      DEFAULTS.reduce((acc, curr) => {
        acc[curr.ders] = { d: 0, y: 0 };
        return acc;
      }, {} as Record<string, { d: number; y: number }>)
    );
    setFormOpen(true);
  };

  const handleEdit = (exam: Exam) => {
    setEditingId(exam.id || null);
    setAd(exam.ad);
    setTarih(new Date(exam.tarih).toISOString().substring(0, 10));
    setNot(exam.not || '');
    
    const newSubs = DEFAULTS.reduce((acc, curr) => {
      const existing = exam.dersler.find(d => d.ders === curr.ders);
      acc[curr.ders] = {
        d: existing ? existing.dogru : 0,
        y: existing ? existing.yanlis : 0
      };
      return acc;
    }, {} as Record<string, { d: number; y: number }>);

    setSubjects(newSubs);
    setFormOpen(true);
    
    // Smooth scroll to top of component or form
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Sınav kaydını tamamen silmek istediğinize emin misiniz?')) {
      await db.exams.delete(id);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    
    const examDersler: ExamSubject[] = Object.entries(subjects).map(([ders, val]) => ({
      ders,
      dogru: (val as any).d,
      yanlis: (val as any).y
    }));

    const computedNet = calculateTotalNet(examDersler);

    const examData: Omit<Exam, 'id'> = {
      ad: ad.trim() || 'Adsız Deneme',
      tarih: new Date(tarih),
      dersler: examDersler,
      toplamNet: computedNet,
      not: not.trim() || undefined
    };

    if (editingId) {
      await db.exams.update(editingId, examData);
    } else {
      await db.exams.add({
        id: crypto.randomUUID(),
        ...examData
      });
    }

    setFormOpen(false);
    setEditingId(null);
  };

  return (
    <div className="kp-exams-section">
      <div className="kp-section-header">
        <div>
          <h2 className="kp-section-title">DENEME DEFTERİ</h2>
          <p className="kp-section-subtitle">Genel Yetenek - Genel Kültür Sınav Analizi ve Hedef Kontrolü</p>
        </div>
        {!formOpen && (
          <Button variant="stamp" onClick={handleOpenNewForm}>
            <Plus size={16} /> Yeni Deneme Girişi
          </Button>
        )}
      </div>

      {/* SVG Trend Chart */}
      <div className="kp-chart-card-container">
        <Card header={<div className="kp-card-header-mono">DENEME NET GELİŞİM GRAFİĞİ</div>}>
          <ExamChart exams={exams} targetNet={targetNet} />
        </Card>
      </div>

      {/* Entry Form (Conditional) */}
      {formOpen && (
        <Card
          className="kp-exam-form-card"
          header={
            <div className="kp-card-header-mono">
              {editingId ? 'DENEME DÜZENLEME PROTOKOLÜ' : 'YENİ DENEME KAYIT PROTOKOLÜ'}
            </div>
          }
        >
          <form onSubmit={handleSave}>
            <div className="kp-form-top-row">
              <div className="kp-form-group">
                <label>Sınav Adı / Yayın</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Pegem Türkiye Geneli 1"
                  value={ad}
                  onChange={e => setAd(e.target.value)}
                />
              </div>
              <div className="kp-form-group">
                <label>Sınav Tarihi</label>
                <input
                  type="date"
                  required
                  value={tarih}
                  onChange={e => setTarih(e.target.value)}
                />
              </div>
            </div>

            {/* Subject Matrix Entry */}
            <div className="kp-form-matrix-title">DERS DAĞILIM MATRİSİ</div>
            <div className="kp-form-matrix-grid">
              {DEFAULTS.map(({ ders, max }) => {
                const item = subjects[ders] || { d: 0, y: 0 };
                const subNet = calculateNet(item.d, item.y);
                const progressPercentage = max > 0 ? Math.round((item.d / max) * 100) : 0;

                return (
                  <div key={ders} className="kp-matrix-row">
                    <div className="kp-matrix-label-col">
                      <span className="kp-matrix-ders">{ders}</span>
                      <span className="kp-matrix-max">Soru: {max}</span>
                    </div>
                    <div className="kp-matrix-input-col">
                      <div>
                        <span className="kp-mini-input-lbl">DOĞRU</span>
                        <input
                          type="number"
                          min={0}
                          max={max}
                          value={item.d}
                          onChange={e => handleSubjectChange(ders, 'd', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <span className="kp-mini-input-lbl">YANLIŞ</span>
                        <input
                          type="number"
                          min={0}
                          max={max}
                          value={item.y}
                          onChange={e => handleSubjectChange(ders, 'y', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="kp-matrix-net-calc">
                        <span className="kp-mini-input-lbl">NET</span>
                        <div className="kp-matrix-net-val kp-lbl-mono">{subNet}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="kp-form-group mt-4">
              <label>Sınav Analiz Notu</label>
              <textarea
                rows={2}
                placeholder="Örn: Tarih soruları zordu, Coğrafya harita eksikliğim var, Vatandaşlık tekrarı lazım."
                value={not}
                onChange={e => setNot(e.target.value)}
              />
            </div>

            <div className="kp-form-footer-totals">
              <div className="kp-live-total-net">
                <span>HESAPLANAN TOPLAM NET:</span>
                <strong className="kp-lbl-mono">{currentTotalNet.toFixed(2)}</strong>
              </div>
              <div className="kp-form-buttons">
                <Button variant="secondary" type="button" onClick={() => setFormOpen(false)}>Vazgeç</Button>
                <Button variant="stamp" type="submit">
                  <Save size={16} /> {editingId ? 'Güncelle' : 'Kaydet'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* Ledger Book Table */}
      <Card header={<div className="kp-card-header-mono">DENEME SINAV ARŞİV DEFTERİ</div>}>
        {exams.length === 0 ? (
          <EmptyState
            title="Sınav Kaydı Yok"
            description="İlk Pazar denemesinden sonra burası grafik ve analitik göstergelere dönüşür. Yukarıdaki butona tıklayarak ilk denemenizi kaydedin."
          />
        ) : (
          <div className="kp-ledger-table-wrapper">
            <table className="kp-ledger-table">
              <thead>
                <tr>
                  <th>Sıra</th>
                  <th>Tarih</th>
                  <th>Sınav Tanımı</th>
                  <th className="text-center">T/M/T/C/V/G Net Dağılımı</th>
                  <th className="text-right">Toplam Net</th>
                  <th className="text-center">Hedef Durumu</th>
                  <th>Notlar/Analiz</th>
                  <th className="text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {[...exams]
                  .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime())
                  .map((exam, index) => {
                    const isTargetMet = exam.toplamNet >= targetNet;
                    
                    // Render individual subject nets
                    const netString = exam.dersler.map(d => {
                      const computed = d.dogru - d.yanlis * 0.25;
                      return `${d.ders[0]}:${computed}`;
                    }).join(' | ');

                    return (
                      <tr key={exam.id}>
                        <td className="kp-lbl-mono">#{exams.length - index}</td>
                        <td className="kp-lbl-mono whitespace-nowrap">
                          {new Date(exam.tarih).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="font-semibold">{exam.ad}</td>
                        <td className="text-center font-mono text-xs kp-lbl-soft">{netString}</td>
                        <td className="text-right font-bold kp-lbl-mono">{exam.toplamNet.toFixed(2)}</td>
                        <td className="text-center">
                          {isTargetMet ? (
                            <Badge variant="ok">✓ GEÇTİ</Badge>
                          ) : (
                            <Badge variant="stamp">BAŞARISIZ</Badge>
                          )}
                        </td>
                        <td className="kp-ledger-note-cell" title={exam.not}>
                          {exam.not || '—'}
                        </td>
                        <td className="text-right kp-ledger-actions">
                          <Button variant="secondary" onClick={() => handleEdit(exam)}>
                            <Edit2 size={12} />
                          </Button>
                          <Button variant="danger" onClick={() => handleDelete(exam.id!)}>
                            <Trash2 size={12} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
