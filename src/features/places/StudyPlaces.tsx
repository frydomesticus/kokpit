import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Place } from '../../db';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import { MapPin, Clock, Edit2, Check, Trash2, Plus, Bookmark } from 'lucide-react';

export default function StudyPlaces() {
  const places = useLiveQuery(() => db.places.toArray()) || [];

  // Form toggles
  const [showAddForm, setShowAddForm] = useState(false);
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  // Form Fields
  const [ad, setAd] = useState('');
  const [ilce, setIlce] = useState('');
  const [kurum, setKurum] = useState<'İBB' | 'Devlet' | 'Diğer'>('İBB');
  const [acilis, setAcilis] = useState(9);
  const [kapanis, setKapanis] = useState(19);
  const [yediYirmiDort, setYediYirmiDort] = useState(false);
  const [notum, setNotum] = useState('');

  const currentHour = new Date().getHours();

  const isCurrentlyOpen = (place: Place): boolean => {
    if (place.yediYirmiDort) return true;
    return currentHour >= place.acilis && currentHour < place.kapanis;
  };

  const handleSavePlace = async (e: FormEvent) => {
    e.preventDefault();
    await db.places.add({
      id: crypto.randomUUID(),
      ad: ad.trim() || 'Yeni Kütüphane',
      ilce: ilce.trim() || 'İstanbul',
      kurum,
      acilis: yediYirmiDort ? 0 : acilis,
      kapanis: yediYirmiDort ? 24 : kapanis,
      yediYirmiDort,
      notum: notum.trim()
    });

    // Reset Form
    setAd('');
    setIlce('');
    setKurum('İBB');
    setAcilis(9);
    setKapanis(19);
    setYediYirmiDort(false);
    setNotum('');
    setShowAddForm(false);
  };

  const handleDeletePlace = async (id: string) => {
    if (confirm('Bu çalışma mekanını silmek istediğinize emin misiniz?')) {
      await db.places.delete(id);
    }
  };

  const handleStartEditNote = (place: Place) => {
    setEditNoteId(place.id || null);
    setNoteValue(place.notum);
  };

  const handleSaveNote = async (id: string) => {
    await db.places.update(id, { notum: noteValue });
    setEditNoteId(null);
  };

  return (
    <div className="kp-places-section">
      <div className="kp-section-header">
        <div>
          <h2 className="kp-section-title">ÇALIŞMA MEKANLARI VE KÜTÜPHANELER</h2>
          <p className="kp-section-subtitle">Sessiz Odaklanma Alanları ve Kişisel Kütüphane Kataloğum</p>
        </div>
        {!showAddForm && (
          <Button variant="stamp" onClick={() => setShowAddForm(true)}>
            <Plus size={16} /> Mekan Ekle
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card
          className="kp-place-form-card"
          header={<div className="kp-card-header-mono">YENİ ÇALIŞMA ALANI EKLEME PROTOKOLÜ</div>}
        >
          <form onSubmit={handleSavePlace}>
            <div className="kp-form-top-row">
              <div className="kp-form-group">
                <label>Mekan / Kütüphane Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Beyoğlu Kitaplığı"
                  value={ad}
                  onChange={e => setAd(e.target.value)}
                />
              </div>
              <div className="kp-form-group">
                <label>Bulunduğu İlçe</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Beyoğlu"
                  value={ilce}
                  onChange={e => setIlce(e.target.value)}
                />
              </div>
            </div>

            <div className="kp-form-top-row">
              <div className="kp-form-group">
                <label>Kurum Statüsü</label>
                <select value={kurum} onChange={e => setKurum(e.target.value as any)}>
                  <option value="İBB">İBB Kütüphanesi</option>
                  <option value="Devlet">Devlet Kütüphanesi</option>
                  <option value="Diğer">Diğer / Özel / Cafe</option>
                </select>
              </div>
              <div className="kp-form-group flex items-end">
                <label className="kp-checkbox-container">
                  <input
                    type="checkbox"
                    checked={yediYirmiDort}
                    onChange={e => setYediYirmiDort(e.target.checked)}
                  />
                  <span>7/24 Kesintisiz Açık</span>
                </label>
              </div>
            </div>

            {!yediYirmiDort && (
              <div className="kp-form-top-row">
                <div className="kp-form-group">
                  <label>Açılış Saati (Örn: 9)</label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={acilis}
                    onChange={e => setAcilis(parseInt(e.target.value) || 9)}
                  />
                </div>
                <div className="kp-form-group">
                  <label>Kapanış Saati (Örn: 22)</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={kapanis}
                    onChange={e => setKapanis(parseInt(e.target.value) || 22)}
                  />
                </div>
              </div>
            )}

            <div className="kp-form-group mt-3">
              <label>Kişisel Mekan Notlarım</label>
              <textarea
                rows={2}
                placeholder="Örn: Prizlerin yeri, yoğunluk saatleri..."
                value={notum}
                onChange={e => setNotum(e.target.value)}
              />
            </div>

            <div className="kp-form-buttons mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowAddForm(false)}>Vazgeç</Button>
              <Button variant="stamp" type="submit">Kaydet</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Grid displaying places */}
      {places.length === 0 ? (
        <EmptyState
          title="Mekan Kaydı Bulunamadı"
          description="Çalışma veriminizi artırmak için ziyaret ettiğiniz kütüphaneleri buraya ekleyebilirsiniz."
        />
      ) : (
        <div className="kp-places-grid">
          {places.map(place => {
            const open = isCurrentlyOpen(place);
            const badgeType = place.kurum === 'İBB' ? 'dosya' : place.kurum === 'Devlet' ? 'normal' : 'mono';

            return (
              <Card key={place.id} className="kp-place-card">
                <div className="kp-place-card-top">
                  <div>
                    <h3 className="kp-place-title">{place.ad}</h3>
                    <div className="kp-place-loc kp-lbl-soft">
                      <MapPin size={12} />
                      <span>{place.ilce}</span>
                    </div>
                  </div>
                  <div className="kp-place-card-badges">
                    <Badge variant={badgeType}>{place.kurum.toUpperCase()}</Badge>
                    {place.yediYirmiDort ? (
                      <Badge variant="stamp">7/24</Badge>
                    ) : (
                      <Badge variant="mono">
                        {String(place.acilis).padStart(2, '0')}:00 — {String(place.kapanis).padStart(2, '0')}:00
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="kp-place-status-row">
                  {open ? (
                    <span className="kp-place-open-now text-ok">
                      <Clock size={12} /> ŞU AN AÇIK
                    </span>
                  ) : (
                    <span className="kp-place-open-now text-stamp">
                      <Clock size={12} /> ŞU AN KAPALI
                    </span>
                  )}
                </div>

                {/* Personal Notes Panel */}
                <div className="kp-place-note-box">
                  <div className="kp-place-note-header">
                    <span className="kp-lbl-soft">KİŞİSEL NOTUM</span>
                    {editNoteId === place.id ? (
                      <Button variant="secondary" className="p-1" onClick={() => handleSaveNote(place.id!)}>
                        <Check size={12} />
                      </Button>
                    ) : (
                      <Button variant="secondary" className="p-1" onClick={() => handleStartEditNote(place)}>
                        <Edit2 size={12} />
                      </Button>
                    )}
                  </div>
                  
                  {editNoteId === place.id ? (
                    <textarea
                      className="kp-place-note-edit"
                      rows={2}
                      value={noteValue}
                      onChange={e => setNoteValue(e.target.value)}
                    />
                  ) : (
                    <p className="kp-place-note-text">
                      {place.notum || 'Henüz not eklenmedi.'}
                    </p>
                  )}
                </div>

                <div className="kp-place-card-actions">
                  <Button variant="danger" className="p-1 text-xs" onClick={() => handleDeletePlace(place.id!)}>
                    <Trash2 size={14} /> Mekanı Sil
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
