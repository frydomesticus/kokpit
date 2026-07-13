import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Note } from '../../db';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import { BookOpen, Plus, Save, Edit2, Calendar, Check, Trash2 } from 'lucide-react';

const MONTH_NAMES: Record<string, string> = {
  '01': 'Ocak', '02': 'Şubat', '03': 'Mart', '04': 'Nisan',
  '05': 'Mayıs', '06': 'Haziran', '07': 'Temmuz', '08': 'Ağustos',
  '09': 'Eylül', '10': 'Ekim', '11': 'Kasım', '12': 'Aralık'
};

export default function GuncelNotes() {
  const notes = useLiveQuery(() => db.notes.toArray()) || [];

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [newText, setNewText] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const formatMonthLabel = (ayStr: string): string => {
    const [year, month] = ayStr.split('-');
    const mName = MONTH_NAMES[month] || month;
    return `${mName.toUpperCase()} ${year}`;
  };

  const handleCreateNoteSheet = async (e: FormEvent) => {
    e.preventDefault();
    // Check if sheet already exists
    const existing = notes.find(n => n.ay === selectedMonth);
    if (existing) {
      alert(`${formatMonthLabel(selectedMonth)} için zaten bir günlük kaydı açılmış. Mevcut kaydı düzenleyebilirsiniz.`);
      return;
    }

    await db.notes.add({
      id: crypto.randomUUID(),
      ay: selectedMonth,
      metin: newText.trim(),
      eklenme: new Date()
    });

    setNewText('');
    setShowAddForm(false);
  };

  const handleStartEdit = (note: Note) => {
    setEditingId(note.id || null);
    setEditText(note.metin);
  };

  const handleSaveEdit = async (id: string) => {
    await db.notes.update(id, { metin: editText.trim() });
    setEditingId(null);
  };

  const handleDeleteSheet = async (id: string) => {
    if (confirm('Bu ayın güncel bilgiler sayfasını silmek istediğinize emin misiniz?')) {
      await db.notes.delete(id);
    }
  };

  // Sort notes newest month first
  const sortedNotes = [...notes].sort((a, b) => b.ay.localeCompare(a.ay));

  return (
    <div className="kp-notes-section">
      <div className="kp-section-header">
        <div>
          <h2 className="kp-section-title">GÜNCEL BİLGİLER GÜNLÜĞÜ</h2>
          <p className="kp-section-subtitle">KPSS Sınavında Çıkabilecek Önemli Gelişmeler, Kültür ve Güncel Olay Arşivi</p>
        </div>
        {!showAddForm && (
          <Button variant="stamp" onClick={() => setShowAddForm(true)}>
            <Plus size={16} /> Yeni Ay Yaprağı Aç
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card
          className="kp-note-form-card"
          header={<div className="kp-card-header-mono">YENİ GÜNCEL BİLGİ YAPRAĞI PROTOKOLÜ</div>}
        >
          <form onSubmit={handleCreateNoteSheet}>
            <div className="kp-form-top-row">
              <div className="kp-form-group">
                <label>Hedef Ay ve Yıl Seçimi</label>
                <input
                  type="month"
                  required
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                />
              </div>
            </div>

            <div className="kp-form-group mt-3">
              <label>Ay İçindeki Önemli Notlar, Keşifler ve Güncel KPSS Bilgileri</label>
              <textarea
                rows={6}
                required
                placeholder="Örn: UNESCO Dünya Mirası Listesine giren yeni antik kentimiz... TÜBİTAK Başkanı ataması..."
                value={newText}
                onChange={e => setNewText(e.target.value)}
              />
            </div>

            <div className="kp-form-buttons mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowAddForm(false)}>Vazgeç</Button>
              <Button variant="stamp" type="submit">Yaprağı Ekle</Button>
            </div>
          </form>
        </Card>
      )}

      {sortedNotes.length === 0 ? (
        <EmptyState
          title="Günlük Yaprağı Bulunmuyor"
          description="Sınava kadar her ay güncel olayları ve kültürel gelişmeleri kaydetmek için yukarıdan yeni bir ay yaprağı oluşturun."
        />
      ) : (
        <div className="kp-notes-journal">
          {sortedNotes.map(note => {
            const isEditingThis = editingId === note.id;

            return (
              <Card
                key={note.id}
                className="kp-note-sheet-card"
                header={
                  <div className="kp-note-sheet-header">
                    <span className="kp-note-sheet-month-title kp-lbl-mono">
                      <Calendar size={14} /> {formatMonthLabel(note.ay)}
                    </span>
                    <div className="kp-note-sheet-actions">
                      {isEditingThis ? (
                        <Button variant="secondary" className="p-1" onClick={() => handleSaveEdit(note.id!)} title="Kaydet">
                          <Check size={14} /> Kaydet
                        </Button>
                      ) : (
                        <Button variant="secondary" className="p-1" onClick={() => handleStartEdit(note)} title="Düzenle">
                          <Edit2 size={14} /> Düzenle
                        </Button>
                      )}
                      <Button variant="danger" className="p-1" onClick={() => handleDeleteSheet(note.id!)} title="Sil">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                }
              >
                {isEditingThis ? (
                  <textarea
                    className="kp-note-sheet-textarea"
                    rows={8}
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                  />
                ) : (
                  <div className="kp-note-sheet-content">
                    {note.metin ? (
                      note.metin.split('\n').map((line, idx) => (
                        <p key={idx} className="kp-journal-line">
                          {line || '\u00A0'}
                        </p>
                      ))
                    ) : (
                      <p className="kp-lbl-soft italic">Bu ay için henüz güncel bilgi notu girilmemiştir.</p>
                    )}
                  </div>
                )}
                <div className="kp-note-sheet-footer kp-lbl-mono">
                  Son Değişiklik:{' '}
                  {new Date(note.eklenme).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
