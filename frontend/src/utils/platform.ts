// 端末の OS の判定（ホーム画面追加の案内と、位置情報の案内で同じ判定を使う）

export type Platform = 'ios' | 'android' | 'other';

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent) && !isIOS();
}

export function getPlatform(): Platform {
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'other';
}
