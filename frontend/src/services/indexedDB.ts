import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Spot } from '../types';

interface SpotCheckinDB extends DBSchema {
  spots: {
    key: string;
    value: Spot;
  };
  metadata: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'spot-checkin-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<SpotCheckinDB> | null = null;

async function getDB(): Promise<IDBPDatabase<SpotCheckinDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<SpotCheckinDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Spotsオブジェクトストア
      if (!db.objectStoreNames.contains('spots')) {
        db.createObjectStore('spots', { keyPath: 'spot_id' });
      }

      // Metadataオブジェクトストア
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata');
      }
    },
  });

  return dbInstance;
}

export const indexedDB = {
  // スポットを全て保存
  saveSpots: async (spots: Spot[]): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction('spots', 'readwrite');

    // 既存データをクリア
    await tx.store.clear();

    // 新しいデータを保存
    for (const spot of spots) {
      await tx.store.put(spot);
    }

    await tx.done;
  },

  // 全スポットを取得
  getAllSpots: async (): Promise<Spot[]> => {
    const db = await getDB();
    return db.getAll('spots');
  },

  // 特定のスポットを取得
  getSpot: async (spotId: string): Promise<Spot | undefined> => {
    const db = await getDB();
    return db.get('spots', spotId);
  },

  // メタデータを保存
  saveMetadata: async (key: string, value: any): Promise<void> => {
    const db = await getDB();
    await db.put('metadata', value, key);
  },

  // メタデータを取得
  getMetadata: async (key: string): Promise<any> => {
    const db = await getDB();
    return db.get('metadata', key);
  },

  // データベースをクリア
  clearAll: async (): Promise<void> => {
    const db = await getDB();
    await db.clear('spots');
    await db.clear('metadata');
  },
};
