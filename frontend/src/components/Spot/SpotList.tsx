import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Spot } from '../../types';

interface SpotListProps {
  spots: Spot[];
}

interface SpotWithDistance extends Spot {
  distance?: number;
}

export default function SpotList({ spots }: SpotListProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [spotsWithDistance, setSpotsWithDistance] = useState<SpotWithDistance[]>([]);
  const [sortBy, setSortBy] = useState<'distance' | 'name'>('distance');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const navigate = useNavigate();

  // ジャンル一覧を取得
  const genres = ['all', ...new Set(spots.map(s => s.genre).filter(g => g))];

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

  useEffect(() => {
    if (userLocation) {
      // 距離を計算
      const withDistance = spots.map(spot => ({
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
      setSpotsWithDistance(spots);
    }
  }, [spots, userLocation]);

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
      : spotsWithDistance.filter(s => s.genre === selectedGenre);
    
    // ソート
    if (sortBy === 'distance' && userLocation) {
      filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.spot_name.localeCompare(b.spot_name));
    }

    return filtered;
  };

  const filteredSpots = getFilteredAndSortedSpots();

  return (
    <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
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
          onChange={(e) => setSortBy(e.target.value as 'distance' | 'name')}
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
          onChange={(e) => setSelectedGenre(e.target.value)}
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
              onClick={() => navigate(`/spots/${spot.spot_id}`)}
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
                    {spot.genre && (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {spot.genre}
                      </span>
                    )}
                    {spot.distance !== undefined && (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        📍 {formatDistance(spot.distance)}
                      </span>
                    )}
                    {!spot.quiz && (
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