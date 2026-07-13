# Kokpit

Kişisel KPSS hazırlık kokpiti. Local-first PWA: sunucu yok, hesap yok, veri cihazda.

Sınav geri sayımı ve kalan deneme pazarları · PDF kitaplık (raf görünümü, kaldığın sayfayı hatırlar) · ÖSYM şablonlu deneme defteri ve net trendi · Monte Carlo net tahmin simülatörü · çalışma mekanları · güncel bilgiler günlüğü.

## Çalıştırma
```bash
npm install
npm run dev
```

## Mimari
React 19 + TypeScript + Vite · Dexie.js (IndexedDB) tek doğruluk kaynağı, useLiveQuery ile reaktif okuma · pdfjs-dist (yerel worker) · özellik-bazlı klasör yapısı (db / features / lib / ui) · vite-plugin-pwa ile offline.

Veriler JSON olarak dışa/içe aktarılabilir (Ayarlar sekmesi). PDF dosyalarının kendisi yedeğe dahil değildir.
