import { useEffect } from 'react';

// 開いているモーダルの数。重なって開いても、最後が閉じるまでロックを保つ
let lockCount = 0;

/**
 * モーダルを開いている間、背景のページがスクロールしないようにする
 */
export function useBodyScrollLock(locked: boolean = true) {
  useEffect(() => {
    if (!locked) return;

    lockCount += 1;
    if (lockCount === 1) {
      // body には付けない。body がスクロール領域になり、sticky のヘッダーが元の位置に戻ってしまう
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.documentElement.style.overflow = '';
      }
    };
  }, [locked]);
}
