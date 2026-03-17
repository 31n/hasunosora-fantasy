import { useNavigate, useLocation } from 'react-router-dom';
import type { User } from '../../types';
import HowToModal from './HowToModal';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header style={{
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      padding: '12px 16px',
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
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* ロゴ・タイトル */}
        <div
          onClick={() => navigate('/')}
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#3b82f6',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minWidth: 'fit-content'
          }}
        >
          🌸 HASU Fantasy
        </div>

        {/* ナビゲーション */}
        <nav style={{
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
          flex: 1,
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '6px 12px',
              backgroundColor: isActive('/') ? '#dbeafe' : 'transparent',
              color: isActive('/') ? '#1e40af' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: isActive('/') ? '600' : '400',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            地図
          </button>
          <button
            onClick={() => navigate('/spots')}
            style={{
              padding: '6px 12px',
              backgroundColor: isActive('/spots') ? '#dbeafe' : 'transparent',
              color: isActive('/spots') ? '#1e40af' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: isActive('/spots') ? '600' : '400',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            一覧
          </button>
          <button
            onClick={() => navigate('/mypage')}
            style={{
              padding: '6px 12px',
              backgroundColor: isActive('/mypage') ? '#dbeafe' : 'transparent',
              color: isActive('/mypage') ? '#1e40af' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: isActive('/mypage') ? '600' : '400',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            マイページ
          </button>

          {/* 使い方ボタン */}
          <HowToModal />
        </nav>
      </div>

      {/* モバイル用ユーザー情報バー */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        marginTop: '8px',
        padding: '8px',
        backgroundColor: '#f9fafb',
        borderRadius: '6px'
      }}
      className="mobile-user-info">
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
          {user.nickname || user.user_id}
        </span>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>
          {user.total_score}点
        </span>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .mobile-user-info {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}