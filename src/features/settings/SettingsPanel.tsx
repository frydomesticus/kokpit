import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { Shield, Download, Upload } from 'lucide-react';

export default function SettingsPanel() {
  const targetNetSetting = useLiveQuery(() => db.settings.get('targetNet'));
  const dailyPageRateSetting = useLiveQuery(() => db.settings.get('dailyPageRate'));

  const targetNet = targetNetSetting?.value ?? 85;
  const dailyPageRate = dailyPageRateSetting?.value ?? 12;

  const [editTargetNet, setEditTargetNet] = useState(targetNet);
  const [editPageRate, setEditPageRate] = useState(dailyPageRate);

  useEffect(() => {
    if (targetNetSetting) setEditTargetNet(targetNetSetting.value);
  }, [targetNetSetting]);

  useEffect(() => {
    if (dailyPageRateSetting) setEditPageRate(dailyPageRateSetting.value);
  }, [dailyPageRateSetting]);

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    await db.settings.put({ key: 'targetNet', value: Number(editTargetNet) });
    await db.settings.put({ key: 'dailyPageRate', value: Number(editPageRate) });
    alert('Ayarlar başarıyla güncellendi.');
  };

  const handleExportBackup = async () => {
    try {
      const backupData: Record<string, any> = {};
      const rawBooks = await db.books.toArray();
      // Omit blob field for backup
      backupData.books = rawBooks.map(({ blob, ...metadata }) => metadata);
      backupData.exams = await db.exams.toArray();
      backupData.places = await db.places.toArray();
      backupData.settings = await db.settings.toArray();
      backupData.notes = await db.notes.toArray();
      backupData.bookmarks = await db.bookmarks.toArray();
      backupData.inks = await db.inks.toArray();
      backupData.mapFeatures = await db.mapFeatures.toArray();
      backupData.version = 3;
      backupData.exportedAt = new Date().toISOString();

      const jsonStr = JSON.stringify(backupData, null, 2);
      const fileBlob = new Blob([jsonStr], { type: 'application/json' });
      const fileUrl = URL.createObjectURL(fileBlob);
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = fileUrl;
      downloadAnchor.download = `kokpit-yedek-${new Date().toISOString().substring(0, 10)}.json`;
      downloadAnchor.click();
      
      URL.revokeObjectURL(fileUrl);
    } catch (err) {
      console.error(err);
      alert('Yedek dışa aktarılamadı: ' + (err as Error).message);
    }
  };

  const handleImportBackup = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileText = await file.text();
      const backupData = JSON.parse(fileText);

      if (backupData.version !== 1 && backupData.version !== 2 && backupData.version !== 3) {
        alert('Hata: Uyumsuz yedek dosyası sürümü.');
        return;
      }

      const infoMsg = `Yedek Kaydı Doğrulandı.\n` +
        `- Kitap Bilgisi Sayısı: ${backupData.books?.length || 0}\n` +
        `- Deneme Sınavı Sayısı: ${backupData.exams?.length || 0}\n` +
        `- Kütüphane / Mekan Sayısı: ${backupData.places?.length || 0}\n` +
        `- Güncel Bilgiler Sayfası: ${backupData.notes?.length || 0}\n` +
        `- Kitap Ayracı Sayısı: ${backupData.bookmarks?.length || 0}\n` +
        `- Çözülmüş Sayfa Çizimi Sayısı: ${backupData.inks?.length || 0}\n` +
        `- Harita Çalışma Noktası Sayısı: ${backupData.mapFeatures?.length || 0}\n\n` +
        `Bu verileri mevcut verilerinizle birleştirmek istiyor musunuz?`;

      if (confirm(infoMsg)) {
        if (backupData.books) {
          for (const book of backupData.books) {
            await db.books.put(book);
          }
        }
        if (backupData.exams) {
          for (const exam of backupData.exams) {
            await db.exams.put(exam);
          }
        }
        if (backupData.places) {
          for (const place of backupData.places) {
            await db.places.put(place);
          }
        }
        if (backupData.notes) {
          for (const note of backupData.notes) {
            await db.notes.put(note);
          }
        }
        if (backupData.settings) {
          for (const setting of backupData.settings) {
            await db.settings.put(setting);
          }
        }
        if (backupData.bookmarks) {
          for (const bm of backupData.bookmarks) {
            await db.bookmarks.put(bm);
          }
        }
        if (backupData.inks) {
          for (const ink of backupData.inks) {
            await db.inks.put(ink);
          }
        }
        if (backupData.mapFeatures) {
          for (const feat of backupData.mapFeatures) {
            await db.mapFeatures.put(feat);
          }
        }
        alert('İthalat protokolü tamamlandı. Sayfa yeniden yükleniyor...');
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert('İçe aktarım başarısız oldu: ' + (err as Error).message);
    }
  };

  return (
    <div className="kp-settings-tab-layout">
      <div className="kp-section-header">
        <div>
          <h2 className="kp-section-title">KOKPİT SİSTEM AYARLARI</h2>
          <p className="kp-section-subtitle">Stratejik Hedefler ve Kişisel Bilgi Güvenliği Portalı</p>
        </div>
      </div>

      <div className="kp-settings-grid">
        {/* Form card */}
        <Card header={<div className="kp-card-header-mono">TEMEL HEDEF PARAMETRELERİ</div>}>
          <form onSubmit={handleSaveSettings}>
            <div className="kp-form-group">
              <label>Hedef Net (GY-GK Barajı)</label>
              <input
                type="number"
                required
                min={0}
                max={120}
                value={editTargetNet}
                onChange={e => setEditTargetNet(parseInt(e.target.value) || 0)}
              />
              <span className="kp-form-desc">Simülatör grafiklerinizde kırmızı hedef çizgisi olarak kullanılır.</span>
            </div>

            <div className="kp-form-group mt-3">
              <label>Günde Ortalama Okuma Kapasitesi (Sayfa)</label>
              <input
                type="number"
                required
                min={1}
                value={editPageRate}
                onChange={e => setEditPageRate(parseInt(e.target.value) || 1)}
              />
              <span className="kp-form-desc">Kitaplarınızın bitiş sürelerini tahmin etmek için kullanılır.</span>
            </div>

            <Button variant="stamp" type="submit" className="w-full mt-4">
              Parametreleri Güncelle
            </Button>
          </form>
        </Card>

        {/* Security card */}
        <Card header={<div className="kp-card-header-mono">YEREL VERİ VE EGEMENLİK PANELİ</div>}>
          <div className="kp-security-info">
            <div className="kp-security-badge-row">
              <Shield size={24} className="text-ok" />
              <strong>Yerel Çalışma Modu Aktif</strong>
            </div>
            <p className="kp-form-desc mt-1">
              Kokpit veritabanınız tamamen cihazınızın <strong>IndexedDB (Yerel Tarayıcı Belleği)</strong> deposunda saklanır. Buluta veya harici hiçbir sunucuya veri gönderilmez. Bilgi gizliliğiniz tamamen sizin elinizdedir.
            </p>
          </div>

          <div className="kp-backup-restore-zone mt-4">
            <div className="kp-backup-box">
              <h5>Yedekleme İşlemleri</h5>
              <p className="kp-form-desc">Kitapların ilerleme dereceleri, sınav notları, hedefleriniz ve günlüğünüz tek tıkla şifresiz JSON formatında bilgisayarınıza yedeklenir (PDF dosyalarının kendisi yedeklenmez).</p>
              <Button variant="secondary" className="w-full mt-2" onClick={handleExportBackup}>
                <Download size={14} /> Veritabanını Dışarı Aktar (.json)
              </Button>
            </div>

            <div className="kp-restore-box mt-3 pt-3 border-t border-[var(--line)]">
              <h5>Yedekten Geri Yükle</h5>
              <p className="kp-form-desc">Daha önce kaydettiğiniz bir yedek dosyasını seçerek verilerinizi geri yükleyebilir veya başka bir tarayıcıya taşıyabilirsiniz.</p>
              
              <div className="kp-file-upload-wrapper w-full mt-2">
                <Button variant="primary" className="w-full">
                  <Upload size={14} /> Yedek Dosyasını İçe Aktar
                </Button>
                <input type="file" accept="application/json" onChange={handleImportBackup} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
