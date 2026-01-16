import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    console.log('[PWA] PWAInstallPrompt mounted');
    
    // 既にPWAとしてインストール済みかチェック
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');

    console.log('[PWA] isStandalone:', isStandalone);

    if (isStandalone) {
      console.log('[PWA] Already installed, not showing prompt');
      return; // 既にインストール済みなら何も表示しない
    }

    // ユーザーが以前に却下したかチェック
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      console.log('[PWA] Days since dismissed:', daysSinceDismissed);
      
      // 7日間は再表示しない
      if (daysSinceDismissed < 7) {
        console.log('[PWA] Dismissed recently, not showing prompt');
        return;
      }
    }

    // Android/Chrome用のbeforeinstallpromptイベント
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event fired!', e);
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    console.log('[PWA] Added beforeinstallprompt listener');

    // iOS Safariの検出
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = (window.navigator as any).standalone;
    
    console.log('[PWA] isIOS:', isIOS, 'isInStandaloneMode:', isInStandaloneMode);
    
    if (isIOS && !isInStandaloneMode) {
      console.log('[PWA] Showing iOS prompt');
      setShowIOSPrompt(true);
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    console.log('[PWA] Install button clicked');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('[PWA] User choice:', outcome);
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    console.log('[PWA] Prompt dismissed by user');
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '16px',
      boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      animation: 'slideUp 0.3s ease-out'
    }}>
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
      
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-icons" style={{ fontSize: '20px' }}>phone_iphone</span>
              ホーム画面に追加
            </h3>
            
            {showIOSPrompt ? (
              <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                <p style={{ margin: '0 0 8px 0' }}>
                  このアプリをホーム画面に追加して、より快適に利用しましょう！
                </p>
                <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '13px' }}>
                  <li>画面下部の <strong>共有ボタン</strong> をタップ</li>
                  <li><strong>「ホーム画面に追加」</strong> を選択</li>
                  <li><strong>「追加」</strong> をタップ</li>
                </ol>
              </div>
            ) : (
              <p style={{ margin: '0', fontSize: '14px' }}>
                このアプリをホーム画面に追加して、アプリのように使えます！
              </p>
            )}
          </div>

          <button
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              lineHeight: '1',
              opacity: 0.8
            }}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {deferredPrompt && !showIOSPrompt && (
          <button
            onClick={handleInstallClick}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '12px',
              backgroundColor: 'white',
              color: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            インストール
          </button>
        )}
      </div>
    </div>
  );
}
