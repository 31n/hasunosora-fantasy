// 画面上部に短く出す通知。alert() と違い、操作を止めない
// 表示は components/Common/ToastHost.tsx が受け持つ

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

type Listener = (toast: ToastMessage) => void;

const listeners = new Set<Listener>();
let nextId = 1;

function show(type: ToastType, message: string) {
  const toast = { id: nextId++, type, message };
  listeners.forEach((listener) => listener(toast));
}

export const toast = {
  success: (message: string) => show('success', message),
  error: (message: string) => show('error', message),
  warning: (message: string) => show('warning', message),
  info: (message: string) => show('info', message),
};

export function subscribeToast(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
