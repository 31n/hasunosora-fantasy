import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { storage } from '../../services/storage';
import type { Spot } from '../../types';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CloseIcon from '@mui/icons-material/Close';

export default function AdminSpotList() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
    loadSpots();
  }, [location.pathname]);

  const checkAuth = () => {
    const password = storage.getAdminPassword();
    if (!password) {
      navigate('/admin');
    }
  };

  const loadSpots = async () => {
    const password = storage.getAdminPassword();
    if (!password) return;

    try {
      const data = await adminApi.getSpots(password);
      setSpots(data.spots);
    } catch (error) {
      console.error('スポット取得エラー:', error);
      alert('スポットの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (spotId: string, spotName: string) => {
    if (!confirm(`「${spotName}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    const password = storage.getAdminPassword();
    if (!password) return;

    try {
      await adminApi.deleteSpot(password, spotId);
      alert('スポットを削除しました');
      loadSpots();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const handleLogout = () => {
    storage.clearAdminPassword();
    navigate('/admin');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h1>スポット管理</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/admin/areas')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            エリア管理
          </button>
          <button
            onClick={() => navigate('/admin/spots/new')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ＋ 新規作成
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ログアウト
          </button>
        </div>
      </div>

      {/* スポット一覧 */}
      {spots.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ marginBottom: '16px', color: '#6b7280' }}>
            スポットがまだありません
          </p>
          <button
            onClick={() => navigate('/admin/spots/new')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            最初のスポットを作成
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px'
        }}>
          {spots.map((spot) => (
            <div
              key={spot.spot_id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {spot.images[0] && (
                <img
                  src={spot.images[0]}
                  alt={spot.spot_name}
                  style={{
                    width: '100%',
                    height: '180px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    marginBottom: '12px'
                  }}
                />
              )}
              
              <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>
                {spot.spot_name}
              </h3>
              
              {spot.genre && (
                <span style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  width: 'fit-content'
                }}>
                  {spot.genre}
                </span>
              )}
              
              <p style={{ 
                color: '#6b7280', 
                fontSize: '14px',
                marginBottom: '12px',
                flex: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {spot.description}
              </p>

              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '12px',
                fontSize: '12px',
                color: '#6b7280',
                flexWrap: 'wrap'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <LocationOnIcon style={{ fontSize: '14px' }} />
                  {spot.detection_radius}m
                </span>
                {spot.quiz ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <EmojiEventsIcon style={{ fontSize: '14px' }} />
                    {spot.quiz.score}点
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CloseIcon style={{ fontSize: '14px' }} />
                    クイズなし
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => navigate(`/admin/spots/${spot.spot_id}/edit`)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  編集
                </button>
                <button
                  onClick={() => handleDelete(spot.spot_id, spot.spot_name)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}