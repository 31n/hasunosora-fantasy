import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../services/api';
import type { User } from '../../types';

interface CreateUserProps {
  onLogin: (user: User) => void;
}

export default function CreateUser({ onLogin }: CreateUserProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    setLoading(true);
    try {
      const user = await userApi.create();
      onLogin(user);
      navigate('/');
    } catch (error: any) {
      alert('エラーが発生しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '24px'
    }}>
      <h1 style={{ marginBottom: '24px' }}>スポットチェックイン</h1>
      <p style={{ marginBottom: '32px', textAlign: 'center' }}>
        ようこそ！新しいユーザーIDを作成します。
      </p>
      
      <button
        onClick={handleCreate}
        disabled={loading}
        style={{
          padding: '16px 32px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
          marginBottom: '16px',
        }}
      >
        {loading ? '作成中...' : '新規ユーザー作成'}
      </button>

      <button
        onClick={() => navigate('/login')}
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
        既存ユーザーでログイン
      </button>
    </div>
  );
}
