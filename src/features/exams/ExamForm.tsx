import { useState, useEffect, type FormEvent } from 'react';
import { db, type Exam, type ExamSubject } from '../../db';
import { calculateNet, calculateTotalNet } from '../../lib/net';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { Save } from 'lucide-react';

const DEFAULTS = [
  { ders: 'Türkçe', max: 30 },
  { ders: 'Matematik', max: 30 },
  { ders: 'Tarih', max: 27 },
  { ders: 'Coğrafya', max: 18 },
  { ders: 'Vatandaşlık', max: 9 },
  { ders: 'Güncel', max: 6 }
];

interface ExamFormProps {
  editingId: string | null;
  defaultAd: string;
  onClose: () => void;
}

export default function ExamForm({ editingId, defaultAd, onClose }: ExamFormProps) {
  const [ad, setAd] = useState(defaultAd);
  const [tarih, setTarih] = useState(new Date().toISOString().substring(0, 10));
  const [not, setNot] = useState('');
  const [subjects, setSubjects] = useState<Record<string, { d: number; y: number }>>(
    DEFAULTS.reduce((acc, curr) => {
      acc[curr.ders] = { d: 0, y: 0 };
      return acc;
    }, {} as Record<string, { d: number; y: number }>)
  );

  // Load exam details if editing
  useEffect(() => {
    if (!editingId) return;
    async function loadExam() {
      const exam = await db.exams.get(editingId);
      if (exam) {
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
      }
    }
    loadExam();
  }, [editingId]);

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

    onClose();
  };

  // Compute live total net
  const currentTotalNet = Object.entries(subjects).reduce((acc, [_, val]) => {
    return acc + ((val as any).d - (val as any).y * 0.25);
  }, 0);

  return (
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
            <Button variant="secondary" type="button" onClick={onClose}>Vazgeç</Button>
            <Button variant="stamp" type="submit">
              <Save size={16} /> {editingId ? 'Güncelle' : 'Kaydet'}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
