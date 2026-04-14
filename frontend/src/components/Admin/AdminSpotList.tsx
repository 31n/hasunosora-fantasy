import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { storage } from '../../services/storage';
import { indexedDB } from '../../services/indexedDB';
import type { Spot, Area } from '../../types';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CloseIcon from '@mui/icons-material/Close';

export default function AdminSpotList() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedArea = searchParams.get('area') ?? '';
  const selectedGenre = searchParams.get('genre') ?? '';
  const selectedQuiz = searchParams.get('quiz') ?? '';

  useEffect(() => {
    checkAuth();
    loadAreas();
    loadSpots();
  }, [location.pathname]);

  const checkAuth = () => {
    const password = storage.getAdminPassword();
    if (!password) {
      navigate('/admin');
    }
  };

  const loadAreas = async () => {
    try {
      const cachedAreas = await indexedDB.getAllAreas();
      setAreas(cachedAreas);
    } catch (error) {
      console.error('エリア取得エラー:', error);
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

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    spots.forEach(s => s.genre?.forEach(g => set.add(g)));
    return Array.from(set).sort();
  }, [spots]);

  const filteredSpots = useMemo(() => {
    return spots.filter(spot => {
      if (selectedArea) {
        if (selectedArea === 'unassigned') {
          if (spot.area) return false;
        } else {
          if (spot.area !== selectedArea) return false;
        }
      }
      if (selectedGenre && !spot.genre?.includes(selectedGenre)) return false;
      if (selectedQuiz === 'yes' && !spot.quizzes?.length) return false;
      if (selectedQuiz === 'no' && spot.quizzes?.length) return false;
      return true;
    });
  }, [spots, selectedArea, selectedGenre, selectedQuiz]);

  const handleExportGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: filteredSpots.map(spot => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [spot.longitude, spot.latitude]
        },
        properties: {
          spot_id: spot.spot_id,
          spot_name: spot.spot_name,
          reading: spot.reading ?? '',
          description: spot.description,
          detection_radius: spot.detection_radius,
          genre: spot.genre,
          area: spot.area ?? '',
          url: spot.url ?? '',
          images: spot.images,
          created_at: spot.created_at,
          updated_at: spot.updated_at
        }
      }))
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date().toISOString().slice(0, 10);
    a.download = `spots_${now}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setFilter = (key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    }, { replace: true });
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
            onClick={() => navigate('/admin/quiz-types')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            クイズタイプ管理
          </button>
          <button
            onClick={() => navigate('/admin/announcements')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            お知らせ管理
          </button>
          <button
            onClick={() => navigate('/admin/stats')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#06b6d4',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            統計
          </button>
          <button
            onClick={() => navigate('/admin/spots/new', { state: { returnSearch: location.search } })}
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
            ＋ 新規スポット
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

      {/* フィルター */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {/* エリアフィルター */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
            エリア
          </label>
          <select
            value={selectedArea}
            onChange={(e) => setFilter('area', e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid ' + (selectedArea ? '#3b82f6' : '#e5e7eb'),
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="">すべてのエリア ({spots.length}件)</option>
            {areas.map(area => {
              const count = spots.filter(s => s.area === area.area_id).length;
              return (
                <option key={area.area_id} value={area.area_id}>
                  {area.area_name} ({count}件)
                </option>
              );
            })}
            <option value="unassigned">
              エリア未設定 ({spots.filter(s => !s.area).length}件)
            </option>
          </select>
        </div>

        {/* ジャンルフィルター */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
            ジャンル
          </label>
          <select
            value={selectedGenre}
            onChange={(e) => setFilter('genre', e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid ' + (selectedGenre ? '#3b82f6' : '#e5e7eb'),
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="">すべてのジャンル</option>
            {allGenres.map(g => {
              const count = spots.filter(s => s.genre?.includes(g)).length;
              return (
                <option key={g} value={g}>
                  {g} ({count}件)
                </option>
              );
            })}
          </select>
        </div>

        {/* クイズフィルター */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
            クイズ
          </label>
          <select
            value={selectedQuiz}
            onChange={(e) => setFilter('quiz', e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid ' + (selectedQuiz ? '#3b82f6' : '#e5e7eb'),
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="">すべて ({spots.length}件)</option>
            <option value="yes">クイズあり ({spots.filter(s => s.quizzes?.length > 0).length}件)</option>
            <option value="no">クイズなし ({spots.filter(s => !s.quizzes?.length).length}件)</option>
          </select>
        </div>

        {/* フィルタークリアボタン */}
        {(selectedArea || selectedGenre || selectedQuiz) && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() => setSearchParams({}, { replace: true })}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#f3f4f6',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                color: '#6b7280',
                fontWeight: '600'
              }}
            >
              フィルターをリセット
            </button>
          </div>
        )}

        {/* GeoJSONエクスポートボタン */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gridColumn: '1 / -1' }}>
          <button
            onClick={handleExportGeoJSON}
            disabled={filteredSpots.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: filteredSpots.length === 0 ? '#d1d5db' : '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: filteredSpots.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            GeoJSONで書き出す ({filteredSpots.length}件)
          </button>
        </div>
      </div>

      {/* スポット一覧 */}
      {filteredSpots.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ marginBottom: '16px', color: '#6b7280' }}>
            {(selectedArea || selectedGenre || selectedQuiz) ? '該当するスポットがありません' : 'スポットがまだありません'}
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
          {filteredSpots.map((spot) => (
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
              
              {spot.genre && spot.genre.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {spot.genre.map((g, idx) => (
                    <span key={idx} style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {g}
                    </span>
                  ))}
                </div>
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
                {spot.quizzes?.length > 0 ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <EmojiEventsIcon style={{ fontSize: '14px' }} />
                    {Math.max(...spot.quizzes.map(q => q.score))}点
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
                  onClick={() => navigate(`/admin/spots/${spot.spot_id}/edit`, { state: { returnSearch: location.search } })}
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