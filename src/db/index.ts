import Dexie, { type Table } from 'dexie';

export interface Book {
  id?: string;
  ders: string;
  ad: string;
  dosyaAdi: string;
  sayfaSayisi: number;
  kalinanSayfa: number;
  renk: string;
  thumbDataUrl?: string;
  blob?: Blob;
  fileKey?: string; // used to match with File System Directory file names
  eklenme: Date;
}

export interface ExamSubject {
  ders: string;
  dogru: number;
  yanlis: number;
}

export interface Exam {
  id?: string;
  tarih: Date;
  ad: string;
  dersler: ExamSubject[];
  toplamNet: number;
  not?: string;
}

export interface Place {
  id?: string;
  ad: string;
  ilce: string;
  kurum: 'İBB' | 'Devlet' | 'Diğer';
  acilis: number; // 0-24 hour
  kapanis: number; // 0-24 hour
  yediYirmiDort: boolean;
  notum: string;
}

export interface Setting {
  key: string;
  value: any;
}

export interface Note {
  id?: string;
  ay: string; // 'YYYY-MM'
  metin: string;
  eklenme: Date;
}

export interface Bookmark {
  id?: string;
  bookId: string;
  sayfa: number;
  etiket: string;
  eklenme: Date;
}

export interface StrokePoint {
  x: number; // 0 to 1
  y: number; // 0 to 1
}

export interface Stroke {
  id: string;
  color: string;
  width: number;
  isHighlighter: boolean;
  points: StrokePoint[];
}

export interface Ink {
  bookId: string;
  sayfa: number;
  strokes: Stroke[];
}

class KokpitDatabase extends Dexie {
  books!: Table<Book>;
  exams!: Table<Exam>;
  places!: Table<Place>;
  settings!: Table<Setting>;
  notes!: Table<Note>;
  bookmarks!: Table<Bookmark>;
  inks!: Table<Ink>;

  constructor() {
    super('KokpitDatabase');
    this.version(1).stores({
      books: 'id, ders, ad',
      exams: 'id, tarih',
      places: 'id, ad',
      settings: 'key',
      notes: 'id, ay'
    });
    this.version(2).stores({
      books: 'id, ders, ad',
      exams: 'id, tarih',
      places: 'id, ad',
      settings: 'key',
      notes: 'id, ay',
      bookmarks: 'id, bookId, sayfa',
      inks: '[bookId+sayfa], bookId'
    });
  }
}

export const db = new KokpitDatabase();

// Pre-populate settings and seed places if empty
export async function seedDatabase() {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.bulkAdd([
      { key: 'examDate', value: '2026-09-06T10:15:00' },
      { key: 'targetNet', value: 85 },
      { key: 'dailyPageRate', value: 12 },
      { key: 'theme', value: 'resmi' }
    ]);
  }

  const placesCount = await db.places.count();
  if (placesCount === 0) {
    await db.places.bulkAdd([
      {
        id: '1',
        ad: 'Atatürk Kitaplığı',
        ilce: 'Beyoğlu',
        kurum: 'İBB',
        acilis: 0,
        kapanis: 24,
        yediYirmiDort: true,
        notum: 'Boğaz manzaralı, sabah erken gitmek gerekiyor.'
      },
      {
        id: '2',
        ad: 'Beyazıt Devlet Kütüphanesi',
        ilce: 'Fatih',
        kurum: 'Devlet',
        acilis: 9,
        kapanis: 22,
        yediYirmiDort: false,
        notum: 'Tarihi atmosfer, sessizlik mükemmel.'
      },
      {
        id: '3',
        ad: 'İPA İstanbul Kitaplığı',
        ilce: 'Florya',
        kurum: 'İBB',
        acilis: 9,
        kapanis: 18,
        yediYirmiDort: false,
        notum: 'Doğa içinde sakin bir çalışma ortamı.'
      },
      {
        id: '4',
        ad: 'Sultanbeyli İlçe Halk Kütüphanesi',
        ilce: 'Sultanbeyli',
        kurum: 'Diğer',
        acilis: 9,
        kapanis: 19,
        yediYirmiDort: false,
        notum: 'Sessiz ve düzenli çalışma alanları.'
      }
    ]);
  }
}
