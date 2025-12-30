import { useNavigate, useLocation } from 'react-router-dom';
import type { User } from '../../types';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      onLogout();
      navigate('/login');
    }
  };

  return (
    <header style={{
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      padding: '16px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* ロゴ・タイトル */}
        <div
          onClick={() => navigate('/')}
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#3b82f6',
            cursor: 'pointer'
          }}
        >
          📍 スポットチェックイン
        </div>

        {/* ナビゲーション */}
        <nav style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 16px',
              backgroundColor: isActive('/') ? '#dbeafe' : 'transparent',
              color: isActive('/') ? '#1e40af' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: isActive('/') ? '600' : '400',
              transition: 'all 0.2s'
            }}
          >
            地図
          </button>
          <button
            onClick={() => navigate('/spots')}
            style={{
              padding: '8px 16px',
              backgroundColor: isActive('/spots') ? '#dbeafe' : 'transparent',
              color: isActive('/spots') ? '#1e40af' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: isActive('/spots') ? '600' : '400',
              transition: 'all 0.2s'
            }}
          >
            一覧
          </button>
          <button
            onClick={() => navigate('/mypage')}
            style={{
              padding: '8px 16px',
              backgroundColor: isActive('/mypage') ? '#dbeafe' : 'transparent',
              color: isActive('/mypage') ? '#1e40af' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: isActive('/mypage') ? '600' : '400',
              transition: 'all 0.2s'
            }}
          >
            マイページ
          </button>

          {/* ユーザー情報 */}
          <div style={{
            marginLeft: '16px',
            paddingLeft: '16px',
            borderLeft: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                {user.nickname || user.user_id}
              </p>
              <p style={{ fontSize: '12px', color: '#6b7280' }}>
                {user.total_score}点
              </p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ログアウト
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
