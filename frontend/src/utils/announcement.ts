import type { Announcement, AnnouncementLevel } from '../types';

/** レベルごとの表示。並びは優先順（緊急が先頭） */
export const LEVEL_STYLES: Record<AnnouncementLevel, { label: string; color: string; background: string }> = {
  urgent: { label: '緊急', color: '#dc2626', background: '#fee2e2' },
  important: { label: '重要', color: '#b45309', background: '#fef3c7' },
  info: { label: 'お知らせ', color: '#2563eb', background: '#dbeafe' },
};

export const ANNOUNCEMENT_LEVELS = Object.keys(LEVEL_STYLES) as AnnouncementLevel[];

/** レベルが付いていない（古い API の）お知らせは通常として扱う */
export const levelOf = (a: Announcement): AnnouncementLevel => a.level ?? 'info';

const READ_KEY = 'spot_checkin_read_announcement_ids';

function readIds(): string[] {
  try {
    const ids = JSON.parse(localStorage.getItem(READ_KEY) || '[]');
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

/** 起動時にモーダルで出すもの。重要・緊急は毎回、通常はまだ見ていないものだけ */
export function announcementsToPopup(active: Announcement[]): Announcement[] {
  const read = new Set(readIds());
  return active.filter(a => levelOf(a) !== 'info' || !read.has(a.announcement_id));
}

/** 見たお知らせを端末に覚える。公開が終わったものは覚えておく必要がないので、公開中のものだけ残す */
export function markAnnouncementsRead(seen: Announcement[], active: Announcement[]) {
  const activeIds = new Set(active.map(a => a.announcement_id));
  const ids = new Set(readIds().filter(id => activeIds.has(id)));
  seen.forEach(a => ids.add(a.announcement_id));
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}
