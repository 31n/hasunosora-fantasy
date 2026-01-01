import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../services/api';
import { storage } from '../../services/storage';
import type { User, CheckInHistory } from '../../types';

interface MyPageProps {
  user: User;
  setUser: (user: User) => void;
}

export default function MyPage({ user, setUser }: MyPageProps) {
  const [nickname, setNickname] = useState('');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [history, setHistory] = useState<CheckInHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUserId, setShowUserId] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await userApi.getHistory(user.user_id);
      setHistory(data.checkins);
    } catch (error) {
      console.error('履歴取得エラー:', error);
    }
  };

  const handleSetNickname = async () => {
    if (!nickname.trim()) {
      alert('ニックネームを入力してください');
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await userApi.setNickname(user.user_id, nickname.trim());
      setUser(updatedUser);
      setIsEditingNickname(false);
      alert('ニックネームを設定しました');
    } catch (error: any) {
      if (error.message.includes('NICKNAME_ALREADY_SET')) {
        alert('ニックネームは既に設定済みです');
      } else {
        alert('エラーが発生しました: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      storage.clearUserId();
      navigate('/login');
      window.location.reload();
    }
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(user.user_id);
    alert('ユーザーIDをコピーしました');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = {
    totalVisits: history.length,
    uniqueSpots: new Set(history.map(h => h.spot_id)).size,
    correctAnswers: history.filter(h => h.quiz_correct).length,
    totalScore: user.total_score
  };

  return (
    <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>マイページ</h1>

      {/* ユーザー情報 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px' }}>プロフィール</h2>
            {!user.nickname && !isEditingNickname && (
              <button
                onClick={() => setIsEditingNickname(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                設定
              </button>
            )}
          </div>

          {user.nickname ? (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                ニックネーム
              </p>
              <p style={{ fontSize: '20px', fontWeight: '600' }}>
                {user.nickname}
              </p>
            </div>
          ) : isEditingNickname ? (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '8px'
              }}>
                ニックネーム（変更不可）
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="ニックネームを入力"
                  maxLength={20}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
                <button
                  onClick={handleSetNickname}
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              ニックネームが未設定です
            </p>
          )}

          <div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              ユーザーID
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <code style={{
                padding: '8px 12px',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '16px',
                letterSpacing: '2px'
              }}>
                {showUserId ? user.user_id : '•••••••••'}
              </code>
              <button
                onClick={() => setShowUserId(!showUserId)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#e5e7eb',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {showUserId ? '隠す' : '表示'}
              </button>
              <button
                onClick={copyUserId}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#e5e7eb',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                📋 コピー
              </button>
            </div>
          </div>
        </div>

        {/* ログアウトボタン */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '16px'
          }}
        >
          ログアウト
        </button>
      </div>

      {/* 統計情報 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>統計</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px'
        }}>
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px' }}>
              {stats.totalScore}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>合計得点</p>
          </div>
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}>
              {stats.uniqueSpots}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>訪問スポット数</p>
          </div>
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '4px' }}>
              {stats.totalVisits}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>総訪問回数</p>
          </div>
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '4px' }}>
              {stats.correctAnswers}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>正解数</p>
          </div>
        </div>
      </div>

      {/* 訪問履歴 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>最近の訪問</h2>
        
        {history.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '24px 0' }}>
            まだ訪問履歴がありません
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.slice(0, 10).map((item, index) => (
              <div
                key={index}
                onClick={() => navigate(`/spots/${item.spot_id}`)}
                style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontWeight: '600' }}>{item.spot_name}</p>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    {formatDate(item.checked_in_at)}
                  </p>
                </div>
                {item.quiz_answered && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      backgroundColor: item.quiz_correct ? '#d1fae5' : '#fee2e2',
                      color: item.quiz_correct ? '#065f46' : '#991b1b',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {item.quiz_correct ? '正解' : '不正解'}
                    </span>
                    {item.quiz_correct && (
                      <span style={{ fontSize: '14px', color: '#059669', fontWeight: '600' }}>
                        +{item.score_earned}点
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}