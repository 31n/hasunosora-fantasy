import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../services/api';
import { storage } from '../../services/storage';
import type { User, CheckInHistory, Spot, Area } from '../../types';

interface MyPageProps {
  user: User;
  setUser: (user: User) => void;
  spots: Spot[];
  areas: Area[];
}

export default function MyPage({ user, setUser, spots, areas }: MyPageProps) {
  const [nickname, setNickname] = useState('');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [history, setHistory] = useState<CheckInHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUserId, setShowUserId] = useState(false);
  const [selectedStatArea, setSelectedStatArea] = useState<string>('all'); // 統計表示用エリア
  const [showAreaCodeInput, setShowAreaCodeInput] = useState(false);
  const [areaCode, setAreaCode] = useState('');
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

  const handleUnlockGenre = async () => {
    if (!genreCode.trim()) {
      alert('ジャンルコードを入力してください');
      return;
    }

    setLoading(true);
    try {
      const result = await userApi.unlockGenre(user.user_id, genreCode.trim());
      setUser(result.user);
      setGenreCode('');
      setShowGenreCodeInput(false);
      alert(`「${result.unlocked_genre}」ジャンルが解放されました！`);
    } catch (error: any) {
      if (error.message.includes('INVALID_GENRE_CODE')) {
        alert('無効なジャンルコードです');
      } else if (error.message.includes('GENRE_ALREADY_UNLOCKED')) {
        alert('このジャンルは既に解放済みです');
      } else {
        alert('エラーが発生しました: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAreaChange = async (areaId: string) => {
    setLoading(true);
    try {
      const updatedUser = await userApi.setSelectedArea(user.user_id, areaId || null);
      setUser(updatedUser);
      alert('エリアを変更しました');
    } catch (error: any) {
      alert('エラーが発生しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(user.user_id);
    alert('ユーザーIDをコピーしました');
  };

  const handleUnlockArea = async () => {
    if (!areaCode.trim()) {
      alert('エリアコードを入力してください');
      return;
    }

    setLoading(true);
    try {
      const result = await userApi.unlockArea(user.user_id, areaCode.trim());
      setUser(result.user);
      setAreaCode('');
      setShowAreaCodeInput(false);
      alert(`${result.unlocked_area} エリアが解放されました！`);
    } catch (error: any) {
      if (error.message.includes('INVALID_AREA_CODE')) {
        alert('無効なエリアコードです');
      } else if (error.message.includes('AREA_ALREADY_UNLOCKED')) {
        alert('このエリアはすでに解放済みです');
      } else {
        alert('エラーが発生しました: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    // タイムゾーン情報がない文字列はUTCとして扱う（バックエンドはUTC保存）
    const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(dateString) ? dateString : dateString + 'Z';
    const date = new Date(normalized);
    const month = Number(date.toLocaleString('ja-JP', { month: 'numeric', timeZone: 'Asia/Tokyo' }));
    const day = Number(date.toLocaleString('ja-JP', { day: 'numeric', timeZone: 'Asia/Tokyo' }));
    const hours = date.toLocaleString('ja-JP', { hour: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' });
    const minutes = date.toLocaleString('ja-JP', { minute: '2-digit', timeZone: 'Asia/Tokyo' }).padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  };

  // エリア別統計計算
  const stats = useMemo(() => {
    const filteredHistory = selectedStatArea === 'all' 
      ? history 
      : history.filter(h => {
          const spot = spots.find(s => s.spot_id === h.spot_id);
          return spot?.area === selectedStatArea;
        });

    return {
      totalVisits: filteredHistory.length,
      uniqueSpots: new Set(filteredHistory.map(h => h.spot_id)).size,
      correctAnswers: filteredHistory.filter(h => h.quiz_correct).length,
      totalScore: filteredHistory.reduce((sum, h) => sum + h.score_earned, 0)
    };
  }, [history, spots, selectedStatArea]);

  return (
    <div style={{ 
      width: '100%',
      maxWidth: '1000px',
      padding: '16px',
      margin: '0 auto',
      boxSizing: 'border-box'
    }}>
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

          {/* エリア選択 */}
          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              選択中のエリア
            </p>
            <select
              value={user.selected_area || ''}
              onChange={(e) => handleAreaChange(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1
              }}
            >
              <option value="">全エリア</option>
              {areas.filter(a => {
                if (!a.is_active) return false;
                // 制限エリアは解放済みの場合のみ表示
                if (a.is_restricted) {
                  return user.unlocked_areas?.includes(a.area_id);
                }
                return true;
              }).map(area => (
                <option key={area.area_id} value={area.area_id}>
                  {area.area_name}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
              選択したエリアのスポットのみが地図に表示されます
            </p>
          </div>

          {/* エリアコード入力 */}
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                隠しエリアの解放
              </h3>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                エリアコードを入力して隠しエリアを解放
              </p>
              {!showAreaCodeInput && (
                <button
                  onClick={() => setShowAreaCodeInput(true)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🔓 コード入力
                </button>
              )}
            </div>

            {user.unlocked_areas && user.unlocked_areas.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                  解放済みエリア
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {user.unlocked_areas.map((areaId) => {
                    const area = areas.find(a => a.area_id === areaId);
                    return (
                      <span key={areaId} style={{
                        padding: '6px 12px',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        {area?.area_name || areaId}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {showAreaCodeInput && (
              <div style={{
                padding: '16px',
                backgroundColor: '#fef3c7',
                borderRadius: '12px',
                marginTop: '12px'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#92400e'
                }}>
                  エリアコードを入力
                </label>
                <input
                  type="text"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  placeholder="コードを入力"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px solid #fbbf24',
                    borderRadius: '8px',
                    fontSize: '16px',
                    marginBottom: '12px',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={handleUnlockArea}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.5 : 1
                    }}
                  >
                    {loading ? '解放中...' : '✨ 解放する'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAreaCodeInput(false);
                      setAreaCode('');
                    }}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px' }}>統計</h2>
          <select
            value={selectedStatArea}
            onChange={(e) => setSelectedStatArea(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '2px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="all">全エリア</option>
            {areas.filter(a => a.is_active).map(area => (
              <option key={area.area_id} value={area.area_id}>
                {area.area_name}
              </option>
            ))}
          </select>
        </div>
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
                onClick={() => navigate(`/spots/${item.spot_id}`, { state: { from: '/mypage' } })}
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