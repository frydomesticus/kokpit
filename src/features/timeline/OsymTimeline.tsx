import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { Edit2, Check, Calendar } from 'lucide-react';

interface Milestone {
  id: string;
  name: string;
  dateStr: string;
  isPast: boolean;
  isActive: boolean;
}

export default function OsymTimeline() {
  const examDateSetting = useLiveQuery(() => db.settings.get('examDate'));
  const examDateStr = examDateSetting?.value || '2026-09-06T10:15:00';

  const [isEditing, setIsEditing] = useState(false);
  const [editedExamDate, setEditedExamDate] = useState(examDateStr.substring(0, 16));

  const handleSaveDate = async () => {
    await db.settings.put({ key: 'examDate', value: `${editedExamDate}:00` });
    setIsEditing(false);
  };

  const milestones: Milestone[] = [
    {
      id: '1',
      name: 'KPSS Lisans Başvuruları',
      dateStr: '3 - 15 Mayıs 2026',
      isPast: true,
      isActive: false
    },
    {
      id: '2',
      name: 'Geç Başvuru Günü',
      dateStr: '28 Mayıs 2026',
      isPast: true,
      isActive: false
    },
    {
      id: '3',
      name: 'Genel Yetenek - Genel Kültür Sınavı',
      dateStr: new Date(examDateStr).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' / 10:15',
      isPast: false,
      isActive: true
    },
    {
      id: '4',
      name: 'ÖSYM Sonuç İlanı',
      dateStr: '15 Ekim 2026 (Öngörülen)',
      isPast: false,
      isActive: false
    },
    {
      id: '5',
      name: 'Tercih ve Atama Süreci',
      dateStr: 'Kasım - Aralık 2026',
      isPast: false,
      isActive: false
    }
  ];

  return (
    <div className="kp-timeline-section">
      <Card header={<div className="kp-card-header-mono">ÖSYM SÜREÇ ÇİZELGESİ VE MİLATLAR</div>}>
        <div className="kp-timeline-horizontal">
          {milestones.map((milestone, idx) => {
            return (
              <div
                key={milestone.id}
                className={`kp-timeline-node ${milestone.isPast ? 'past' : ''} ${milestone.isActive ? 'active' : ''}`}
              >
                <div className="kp-node-indicator">
                  {milestone.isPast ? (
                    <span className="kp-node-check">✓</span>
                  ) : (
                    <span className="kp-node-number">{idx + 1}</span>
                  )}
                </div>
                <div className="kp-node-details">
                  <h4 className="kp-node-title">{milestone.name}</h4>
                  <p className="kp-node-date kp-lbl-mono">{milestone.dateStr}</p>
                  {milestone.isActive && <Badge variant="stamp">SINAV GÜNÜ</Badge>}
                  {milestone.isPast && <Badge variant="ok">TAMAMLANDI</Badge>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit Sınav Günü setting widget */}
        <div className="kp-timeline-editor">
          {isEditing ? (
            <div className="kp-date-editor-row">
              <div className="kp-form-group">
                <label>Sınav Tarihi ve Saati Ayarı</label>
                <input
                  type="datetime-local"
                  value={editedExamDate}
                  onChange={e => setEditedExamDate(e.target.value)}
                />
              </div>
              <div className="kp-editor-actions">
                <Button variant="secondary" onClick={() => setIsEditing(false)}>Vazgeç</Button>
                <Button variant="primary" onClick={handleSaveDate}>
                  <Check size={14} /> Kaydet
                </Button>
              </div>
            </div>
          ) : (
            <div className="kp-date-viewer-row">
              <span className="kp-lbl-soft">
                <Calendar size={14} /> Sınav Tarihi Parametresi: <strong>{new Date(examDateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
              </span>
              <Button variant="secondary" onClick={() => { setEditedExamDate(examDateStr.substring(0, 16)); setIsEditing(true); }}>
                <Edit2 size={12} /> Tarihi Değiştir
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
