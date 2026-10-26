import { useEffect, useState } from 'react';
import type { SvgIconComponent } from '@mui/icons-material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { subscribeToast, type ToastMessage, type ToastType } from '../../utils/toast';

const STYLES: Record<ToastType, { background: string; icon: SvgIconComponent }> = {
  success: { background: '#16a34a', icon: CheckCircleIcon },
  error: { background: '#dc2626', icon: ErrorOutlineIcon },
  warning: { background: '#d97706', icon: WarningAmberIcon },
  info: { background: '#1f2937', icon: InfoOutlinedIcon },
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
          {(() => {
            const Icon = STYLES[toast.type].icon;
            return <Icon style={{ fontSize: '20px', flexShrink: 0 }} aria-hidden="true" />;
          })()}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
