import type { User } from '../types';

// LocalStorage操作
const STORAGE_KEYS = {
  USER_ID: 'spot_checkin_user_id',
  USER: 'spot_checkin_user',
  MASTER_VERSION: 'spot_checkin_master_version',
  ADMIN_PASSWORD: 'spot_checkin_admin_password',
};

export const storage = {
  // ユーザーID
  getUserId: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.USER_ID);
  },

  setUserId: (userId: string): void => {
    localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  },

  clearUserId: (): void => {
    localStorage.removeItem(STORAGE_KEYS.USER_ID);
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  // 前回取ったユーザー情報（起動時に、ログインの応答を待たずに画面を出すため）
  getCachedUser: (userId: string): User | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      const user = raw ? (JSON.parse(raw) as User) : null;
      return user && user.user_id === userId ? user : null;
    } catch {
      return null;
    }
  },

  setCachedUser: (user: User): void => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  // マスターバージョン
  getMasterVersion: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.MASTER_VERSION);
  },

  setMasterVersion: (version: string): void => {
    localStorage.setItem(STORAGE_KEYS.MASTER_VERSION, version);
  },

  // 管理者パスワード（セッションのみ）
  getAdminPassword: (): string | null => {
    return sessionStorage.getItem(STORAGE_KEYS.ADMIN_PASSWORD);
  },

  setAdminPassword: (password: string): void => {
    sessionStorage.setItem(STORAGE_KEYS.ADMIN_PASSWORD, password);
  },

  clearAdminPassword: (): void => {
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_PASSWORD);
  },
};
