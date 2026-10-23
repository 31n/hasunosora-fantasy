import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// 履歴のエントリごとのスクロール位置
const positions = new Map<string, number>();

/**
 * ページ全体のスクロール位置を、画面の移動に合わせて扱う
 * - 新しい画面に進んだときは先頭から
 * - 戻る・進むのときは、その画面を離れたときの位置に戻す
 */
export function useScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const currentKey = useRef(location.key);

  // ブラウザ任せにすると、SPA では違う画面の位置に飛ぶことがある
  // 位置は離れるときではなくスクロールのたびに記録する（離れるときには次の画面の DOM に変わっているため）
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    const onScroll = () => positions.set(currentKey.current, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    currentKey.current = location.key;
    const saved = navigationType === 'POP' ? positions.get(location.key) : undefined;
    window.scrollTo(0, saved ?? 0);
    if (!saved) return;

    // 一覧などは描画のあとで中身が入るので、ページが十分に伸びるまで少し待って合わせ直す
    let frame = 0;
    let tries = 0;
    const retry = () => {
      if (window.scrollY >= saved - 1 || tries++ > 60) return;
      window.scrollTo(0, saved);
      frame = requestAnimationFrame(retry);
    };
    frame = requestAnimationFrame(retry);
    // 待っている間にユーザーが触ったら、それ以上は動かさない
    const stop = () => cancelAnimationFrame(frame);
    window.addEventListener('touchstart', stop, { once: true, passive: true });
    window.addEventListener('wheel', stop, { once: true, passive: true });
    return () => {
      stop();
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('wheel', stop);
    };
  }, [location.key, navigationType]);
}
