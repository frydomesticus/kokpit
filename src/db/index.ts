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
  page: number;
  label: string;
  created: Date;
}

export interface StrokePoint {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  tool: 'pen' | 'highlighter';
  color: string;
  size: number;
  points: [number, number, number][]; // [nx, ny, pressure]
}

export interface Ink {
  bookId: string;
  page: number;
  strokes: Stroke[];
  updated: Date;
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
  temp_inks!: Table<any>;

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
    this.version(4).stores({
      books: 'id, ders, ad',
      exams: 'id, tarih',
      places: 'id, ad',
      settings: 'key',
      notes: 'id, ay',
      bookmarks: 'id, bookId',
      inks: '[bookId+sayfa], bookId',
      temp_inks: '[bookId+page], bookId',
      mapFeatures: 'id, category'
    }).upgrade(async tx => {
      // Migrate bookmarks: sayfa -> page, etiket -> label, eklenme -> created
      const oldBookmarks = await tx.table('bookmarks').toArray();
      for (const bm of oldBookmarks) {
        if ('sayfa' in bm || 'etiket' in bm) {
          const newBm = {
            id: bm.id,
            bookId: bm.bookId,
            page: bm.sayfa ?? (bm as any).page,
            label: bm.etiket ?? (bm as any).label ?? `Sayfa ${bm.sayfa}`,
            created: bm.eklenme ?? (bm as any).created ?? new Date()
          };
          await tx.table('bookmarks').put(newBm);
        }
      }

      // Migrate inks to temp_inks
      const oldInks = await tx.table('inks').toArray();
      for (const ink of oldInks) {
        const newInksStrokes = (ink.strokes || []).map((s: any) => {
          const mappedPoints = (s.points || []).map((pt: any) => {
            if (Array.isArray(pt)) return pt;
            return [pt.x, pt.y, 0.5];
          });
          return {
            id: s.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11)),
            tool: s.tool || (s.isHighlighter ? 'highlighter' : 'pen'),
            color: s.color,
            size: s.size || s.width || 2,
            points: mappedPoints
          };
        });

        await tx.table('temp_inks').put({
          bookId: ink.bookId,
          page: ink.sayfa ?? ink.page,
          strokes: newInksStrokes,
          updated: ink.updated || new Date()
        });
      }
    });

    this.version(5).stores({
      books: 'id, ders, ad',
      exams: 'id, tarih',
      places: 'id, ad',
      settings: 'key',
      notes: 'id, ay',
      bookmarks: 'id, bookId',
      inks: '[bookId+page], bookId',
      temp_inks: null,
      mapFeatures: 'id, category'
    }).upgrade(async tx => {
      const tempInks = await tx.table('temp_inks').toArray();
      for (const ink of tempInks) {
        await tx.table('inks').put(ink);
      }
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
