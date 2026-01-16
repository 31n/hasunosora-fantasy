import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../services/api';
import type { User } from '../../types';
import PWAInstallPrompt from '../Common/PWAInstallPrompt';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId.trim()) {
      setError('ユーザーIDを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await userApi.login(userId.trim().toUpperCase());
      onLogin(user);
      navigate('/');
    } catch (error: any) {
      if (error.message.includes('USER_NOT_FOUND')) {
        setError('ユーザーIDが見つかりません');
      } else {
        setError('エラーが発生しました: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PWAInstallPrompt />
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        padding: '24px',
        backgroundColor: '#f3f4f6'
      }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ marginBottom: '8px', textAlign: 'center' }}>ログイン</h1>
        <p style={{ marginBottom: '24px', textAlign: 'center', color: '#6b7280' }}>
          ユーザーIDを入力してログイン
        </p>
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              ユーザーID（9文字）
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="例: A3BK7E9FH"
              maxLength={9}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                textTransform: 'uppercase',
                fontFamily: 'monospace',
                letterSpacing: '2px'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              marginBottom: '16px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              marginBottom: '16px',
            }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div style={{ 
          textAlign: 'center',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <p style={{ marginBottom: '12px', color: '#6b7280' }}>
            初めてご利用の方
          </p>
          <button
            onClick={() => navigate('/create')}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: '#3b82f6',
              border: '2px solid #3b82f6',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            新規ユーザー作成
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
