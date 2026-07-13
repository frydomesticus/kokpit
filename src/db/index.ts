import Dexie, { type Table } from 'dexie';
import { SEED_PLACES, SEED_FEATURES } from './seedData';

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

export interface MapFeature {
  id: string;
  category: 'daglar' | 'akarsular' | 'platolar';
  ad: string;
  x: number;
  y: number;
  detay: string;
  kpssNotu: string;
  kullaniciNotu?: string;
  yapildi?: boolean;
}

class KokpitDatabase extends Dexie {
  books!: Table<Book>;
  exams!: Table<Exam>;
  places!: Table<Place>;
  settings!: Table<Setting>;
  notes!: Table<Note>;
  bookmarks!: Table<Bookmark>;
  inks!: Table<Ink>;
  mapFeatures!: Table<MapFeature>;

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
    this.version(3).stores({
      books: 'id, ders, ad',
      exams: 'id, tarih',
      places: 'id, ad',
      settings: 'key',
      notes: 'id, ay',
      bookmarks: 'id, bookId, sayfa',
      inks: '[bookId+sayfa], bookId',
      mapFeatures: 'id, category'
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
    await db.places.bulkAdd(SEED_PLACES);
  }

  const featuresCount = await db.mapFeatures.count();
  if (featuresCount === 0) {
    await db.mapFeatures.bulkAdd(SEED_FEATURES);
  }
}
