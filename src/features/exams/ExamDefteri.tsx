import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Exam } from '../../db';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Card from '../../ui/Card';
import EmptyState from '../../ui/EmptyState';
import ExamChart from './ExamChart';
import ExamForm from './ExamForm';
import { Plus, Trash2, Edit2 } from 'lucide-react';

export default function ExamDefteri() {
  const exams = useLiveQuery(() => db.exams.toArray()) || [];
  const targetNetSetting = useLiveQuery(() => db.settings.get('targetNet'));
  const targetNet = targetNetSetting?.value || 85;

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleOpenNewForm = () => {
    setEditingId(null);
    setFormOpen(true);
  };

  const handleEdit = (exam: Exam) => {
    setEditingId(exam.id || null);
    setFormOpen(true);
    
    // Smooth scroll to top of component or form
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Sınav kaydını tamamen silmek istediğinize emin misiniz?')) {
      await db.exams.delete(id);
    }
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
        <ExamForm
          editingId={editingId}
          defaultAd={`Deneme Sınavı #${exams.length + 1}`}
          onClose={() => {
            setFormOpen(false);
            setEditingId(null);
          }}
        />
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
