import { db } from './index';
import { newId } from '../lib/id';

export async function migrateLegacy(): Promise<void> {
  try {
    // 1. Guard check: check if migration has already run successfully
    const settingsStore = await db.settings.get('legacyMigrated');
    if (settingsStore?.value === true) {
      return;
    }

    // 2. Detect if old 'KokpitDatabase' exists
    let oldDbExists = false;
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      oldDbExists = dbs.some(d => d.name === 'KokpitDatabase');
    } else {
      // Fallback detection
      oldDbExists = await new Promise<boolean>((resolve) => {
        const req = indexedDB.open('KokpitDatabase');
        req.onsuccess = (e: any) => {
          const dbInstance = e.target.result;
          const hasStores = dbInstance.objectStoreNames.length > 0;
          dbInstance.close();
          if (!hasStores) {
            indexedDB.deleteDatabase('KokpitDatabase');
            resolve(false);
          } else {
            resolve(true);
          }
        };
        req.onerror = () => resolve(false);
      });
    }

    if (!oldDbExists) {
      // Old DB doesn't exist, flag as migrated and exit
      await db.settings.put({ key: 'legacyMigrated', value: true });
      return;
    }

    console.log('Eski veri tabanı tespit edildi. Otomatik veri taşıma işlemi başlatılıyor...');

    // 3. Open raw database connection to 'KokpitDatabase' to read data schema-agnostically
    const oldData = await new Promise<Record<string, any[]> | null>((resolve, reject) => {
      const req = indexedDB.open('KokpitDatabase');
      req.onsuccess = async (e: any) => {
        const oldDbInstance = e.target.result;
        const stores = Array.from(oldDbInstance.objectStoreNames) as string[];
        if (stores.length === 0) {
          oldDbInstance.close();
          resolve(null);
          return;
        }

        try {
          const tx = oldDbInstance.transaction(stores, 'readonly');
          const data: Record<string, any[]> = {};
          
          for (const storeName of stores) {
            data[storeName] = await new Promise<any[]>((resStore, rejStore) => {
              const store = tx.objectStore(storeName);
              const getReq = store.getAll();
              getReq.onsuccess = () => resStore(getReq.result || []);
              getReq.onerror = () => rejStore(getReq.error);
            });
          }
          oldDbInstance.close();
          resolve(data);
        } catch (err) {
          oldDbInstance.close();
          reject(err);
        }
      };
      req.onerror = () => reject(req.error);
    });

    if (!oldData) {
      await db.settings.put({ key: 'legacyMigrated', value: true });
      return;
    }

    // 4. Map & Copy every record into the new 'KokpitDB'
    await db.transaction('rw', [db.books, db.exams, db.places, db.settings, db.notes, db.bookmarks, db.inks, db.mapFeatures], async () => {
      // Books
      if (oldData.books) {
        for (const book of oldData.books) {
          await db.books.put(book);
        }
      }

      // Exams
      if (oldData.exams) {
        for (const exam of oldData.exams) {
          await db.exams.put(exam);
        }
      }

      // Places
      if (oldData.places) {
        for (const place of oldData.places) {
          await db.places.put(place);
        }
      }

      // Settings
      if (oldData.settings) {
        for (const setting of oldData.settings) {
          await db.settings.put(setting);
        }
      }

      // Notes
      if (oldData.notes) {
        for (const note of oldData.notes) {
          await db.notes.put(note);
        }
      }

      // MapFeatures
      if (oldData.mapFeatures) {
        for (const feat of oldData.mapFeatures) {
          await db.mapFeatures.put(feat);
        }
      }

      // Bookmarks: sayfa -> page, etiket -> label, eklenme -> created
      if (oldData.bookmarks) {
        for (const bm of oldData.bookmarks) {
          await db.bookmarks.put({
            id: bm.id,
            bookId: bm.bookId,
            page: bm.page ?? bm.sayfa,
            label: bm.label ?? bm.etiket ?? `Sayfa ${bm.sayfa || bm.page}`,
            created: bm.created ? new Date(bm.created) : (bm.eklenme ? new Date(bm.eklenme) : new Date())
          });
        }
      }

      // Inks: sayfa -> page, normalize points, prefer temp_inks
      const tempInksMap = new Map<string, any>();
      if (oldData.temp_inks) {
        for (const tInk of oldData.temp_inks) {
          const key = `${tInk.bookId}-${tInk.page ?? tInk.sayfa}`;
          tempInksMap.set(key, tInk);
        }
      }

      if (oldData.inks) {
        for (const ink of oldData.inks) {
          const key = `${ink.bookId}-${ink.page ?? ink.sayfa}`;
          const finalInk = tempInksMap.get(key) || ink;

          const mappedStrokes = (finalInk.strokes || []).map((s: any) => {
            const mappedPoints = (s.points || []).map((pt: any) => {
              if (Array.isArray(pt)) return pt;
              return [pt.x, pt.y, 0.5]; // {x, y} -> [x, y, pressure]
            });
            return {
              id: s.id || newId(),
              tool: s.tool || (s.isHighlighter ? 'highlighter' : 'pen'),
              color: s.color,
              size: s.size || s.width || 2,
              points: mappedPoints
            };
          });

          await db.inks.put({
            bookId: finalInk.bookId,
            page: finalInk.page ?? finalInk.sayfa,
            strokes: mappedStrokes,
            updated: finalInk.updated ? new Date(finalInk.updated) : new Date()
          });
        }
      }

      // Mark legacy migrated flag as true in settings
      await db.settings.put({ key: 'legacyMigrated', value: true });
    });

    console.log('Eski veritabanı kopyalaması başarıyla tamamlandı. Eski veritabanı siliniyor...');

    // 5. Delete the old database
    await new Promise<void>((resolve) => {
      const deleteReq = indexedDB.deleteDatabase('KokpitDatabase');
      deleteReq.onsuccess = () => {
        console.log('Eski veritabanı "KokpitDatabase" silindi.');
        resolve();
      };
      deleteReq.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Veri göçü başarısız oldu (bu adım sessizce geçildi):', err);
  }
}
