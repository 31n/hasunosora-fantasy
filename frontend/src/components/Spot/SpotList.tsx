import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Spot, User, Area } from '../../types';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { spotHasQuizForUser } from '../../utils/quiz';

interface SpotListProps {
  spots: Spot[];
  user: User;
  areas: Area[];
}

interface SpotWithDistance extends Spot {
  distance?: number;
}

export default function SpotList({ spots, user, areas }: SpotListProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [spotsWithDistance, setSpotsWithDistance] = useState<SpotWithDistance[]>([]);
  const [sortBy, setSortBy] = useState<'distance' | 'name'>(() => {
    const saved = sessionStorage.getItem('spotList_sortBy');
    return (saved as 'distance' | 'name') || 'distance';
  });
  const [selectedGenre, setSelectedGenre] = useState<string>(() => {
    const saved = sessionStorage.getItem('spotList_selectedGenre');
    return saved || 'all';
  });
  const navigate = useNavigate();

  // ユーザーの選択エリアに基づいてスポットをフィルタリング
  const filteredByArea = user.selected_area
    ? spots.filter(spot => spot.area === user.selected_area)
    : spots;

  useEffect(() => {
    // 位置情報を取得
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error('位置情報取得エラー:', error);
        }
      );
    }
  }, []);

  // ジャンル一覧を保存するstate
  const [genres, setGenres] = useState<string[]>(['all']);

  useEffect(() => {
    // 制限エリアをフィルタリング
    const userUnlockedAreas = user.unlocked_areas || [];
    const unlockedSpots = filteredByArea.filter(spot => {
      if (!spot.area) return true;
      const area = areas.find(a => a.area_id === spot.area);
      if (!area) return true;
      if (area.is_restricted && !userUnlockedAreas.includes(area.area_id)) {
        return false;
      }
      return true;
    });
    
    // ジャンル一覧を制限フィルタリング後のスポットから取得
    const availableGenres = ['all', ...new Set(unlockedSpots.flatMap(s => s.genre || []))];
    setGenres(availableGenres);
    
    if (userLocation) {
      // 距離を計算
      const withDistance = unlockedSpots.map(spot => ({
        ...spot,
        distance: calculateDistance(
          userLocation[0],
          userLocation[1],
          spot.latitude,
          spot.longitude
        )
      }));
      setSpotsWithDistance(withDistance);
    } else {
      setSpotsWithDistance(unlockedSpots);
    }
  }, [filteredByArea, userLocation, user.unlocked_areas, areas]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // 地球の半径（メートル）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (distance?: number): string => {
    if (!distance) return '距離不明';
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const getFilteredAndSortedSpots = () => {
    // ジャンルでフィルタ
    let filtered = selectedGenre === 'all' 
      ? [...spotsWithDistance]
      : spotsWithDistance.filter(s => s.genre && s.genre.includes(selectedGenre));
    
    // ソート
    if (sortBy === 'distance' && userLocation) {
      filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => {
        const keyA = a.reading || a.spot_name;
        const keyB = b.reading || b.spot_name;
        return keyA.localeCompare(keyB, 'ja');
      });
    }

    return filtered;
  };

  const filteredSpots = getFilteredAndSortedSpots();

  return (
    <div style={{ 
      width: '100%',
      maxWidth: '1000px',
      padding: '16px',
      margin: '0 auto',
      boxSizing: 'border-box'
    }}>
      <h1 style={{ marginBottom: '24px' }}>スポット一覧</h1>

      {/* フィルター・ソート */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <select
          value={sortBy}
          onChange={(e) => {
            const value = e.target.value as 'distance' | 'name';
            setSortBy(value);
            sessionStorage.setItem('spotList_sortBy', value);
          }}
          style={{
            padding: '8px 12px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="distance">距離順</option>
          <option value="name">名前順</option>
        </select>

        <select
          value={selectedGenre}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedGenre(value);
            sessionStorage.setItem('spotList_selectedGenre', value);
          }}
          style={{
            padding: '8px 12px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="all">すべてのジャンル</option>
          {genres.filter(g => g !== 'all').map(genre => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>
      </div>

      {/* スポットカウント */}
      <p style={{ 
        marginBottom: '16px', 
        color: '#6b7280', 
        fontSize: '14px' 
      }}>
        {filteredSpots.length}件のスポット
      </p>

      {/* スポットリスト */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredSpots.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '48px 0' }}>
            スポットが見つかりません
          </p>
        ) : (
          filteredSpots.map((spot) => (
            <div
              key={spot.spot_id}
              onClick={() => navigate(`/spots/${spot.spot_id}`, { state: { from: '/spots' } })}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: '1px solid #e5e7eb'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={{ display: 'flex', gap: '16px' }}>
                {spot.images[0] && (
                  <img
                    src={spot.images[0]}
                    alt={spot.spot_name}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '8px'
                    }}
                  />
                )}
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>
                    {spot.spot_name}
                  </h3>
                  <p style={{ 
                    color: '#6b7280', 
                    fontSize: '14px',
                    marginBottom: '8px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {spot.description}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {spot.genre && spot.genre.length > 0 && spot.genre.map((g, idx) => (
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
                    {spot.distance !== undefined && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 12px',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        <LocationOnIcon style={{ fontSize: '14px' }} />
                        {formatDistance(spot.distance)}
                      </span>
                    )}
                    {!spotHasQuizForUser(spot, user) && (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        backgroundColor: '#e5e7eb',
                        color: '#6b7280',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        クイズなし
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: '#9ca3af'
                }}>
                  →
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}