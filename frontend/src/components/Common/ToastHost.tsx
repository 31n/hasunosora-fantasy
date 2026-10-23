import { useEffect, useState } from 'react';
import { subscribeToast, type ToastMessage, type ToastType } from '../../utils/toast';

const STYLES: Record<ToastType, { background: string; icon: string }> = {
  success: { background: '#16a34a', icon: '✓' },
  error: { background: '#dc2626', icon: '!' },
  warning: { background: '#d97706', icon: '!' },
  info: { background: '#1f2937', icon: 'i' },
};

// 表示しておく時間。エラーは読み切れるよう長めにする
const DURATION: Record<ToastType, number> = {
  success: 2500,
  error: 5000,
  warning: 4000,
  info: 3000,
};

// 同時に出すのは最大3件。古いものから消す
const MAX_TOASTS = 3;

export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return subscribeToast((toast) => {
      setToasts((current) => {
        // 同じ文言が出ているときは重ねない（ボタンの連打など）
        const rest = current.filter((t) => t.message !== toast.message);
        return [...rest, toast].slice(-MAX_TOASTS);
      });
      setTimeout(() => dismiss(toast.id), DURATION[toast.type]);
    });
  }, []);

  const dismiss = (id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'calc(12px + env(safe-area-inset-top))',
        left: '16px',
        right: '16px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      <style>{`
        @keyframes toastIn {
          from { transform: translateY(-12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            maxWidth: '480px',
            width: '100%',
            padding: '12px 16px',
            backgroundColor: STYLES[toast.type].background,
            color: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            fontSize: '14px',
            fontWeight: 600,
            lineHeight: 1.5,
            cursor: 'pointer',
            pointerEvents: 'auto',
            animation: 'toastIn 0.2s ease-out',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              flexShrink: 0,
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {STYLES[toast.type].icon}
          </span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
