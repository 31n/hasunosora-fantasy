import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { getPlatform, type Platform } from '../../utils/platform';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocationOffIcon from '@mui/icons-material/LocationOff';

// 拒否されているときの、設定で許可する手順（端末の OS に合わせて1つだけ出す）
const SETTINGS_STEPS: Record<Platform, string> = {
  ios: '「設定」→「プライバシーとセキュリティ」→「位置情報サービス」をオンにし、「Safari Web サイト」で位置情報を許可してください。',
  android: '端末の「設定」で位置情報をオンにし、ブラウザのサイト設定で、このサイトの位置情報を許可してください。',
  other: 'ブラウザのアドレスバーの鍵のアイコンなどから、このサイトの位置情報を許可してください。',
};

export type LocationDialogMode = 'prompt' | 'denied';

interface LocationPermissionDialogProps {
  mode: LocationDialogMode;
  // prompt: 「許可する」 / denied: 「もう一度試す」
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * 位置情報の案内
 * - prompt: まだ許可されていないとき。OS の確認を出す前に、何に使うかを説明する
 * - denied: 拒否されているとき。設定で許可する手順を案内する
 */
export default function LocationPermissionDialog({ mode, onConfirm, onClose }: LocationPermissionDialogProps) {
  useBodyScrollLock();

  const isPrompt = mode === 'prompt';
  const platform = getPlatform();

  return (
    <div
      onClick={onClose}
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-dialog-title"
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '28px 24px 24px',
          width: '100%',
          maxWidth: '400px',
          maxHeight: '80dvh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
        }}
      >
        <div style={{ lineHeight: 1, marginBottom: '8px' }} aria-hidden="true">
          {isPrompt
            ? <LocationOnIcon style={{ fontSize: '52px', color: '#3b82f6' }} />
            : <LocationOffIcon style={{ fontSize: '52px', color: '#ef4444' }} />}
        </div>
        <h2 id="location-dialog-title" style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '12px' }}>
          {isPrompt ? '位置情報を使います' : '位置情報がオフになっています'}
        </h2>

        {isPrompt ? (
          <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.7, textAlign: 'left' }}>
            <p style={{ marginBottom: '8px' }}>
              地図に現在地を表示し、スポットの近くにいるかを確かめてチェックインやクイズができるようにします。
            </p>
            <p>
              次に表示される確認で「<strong>許可</strong>」を選んでください。
            </p>
          </div>
        ) : (
          <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.7, textAlign: 'left' }}>
            <p style={{ marginBottom: '12px' }}>
              チェックインやクイズには位置情報が必要です。設定で許可してから「もう一度試す」を押してください。
            </p>
            <div style={{ backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
              {SETTINGS_STEPS[platform]}
            </div>
          </div>
        )}

        <button
          onClick={onConfirm}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '14px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          {isPrompt ? '許可する' : 'もう一度試す'}
        </button>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: '8px',
            padding: '12px',
            backgroundColor: 'transparent',
            color: '#6b7280',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          {isPrompt ? 'あとで' : '閉じる'}
        </button>
      </div>
    </div>
  );
}
