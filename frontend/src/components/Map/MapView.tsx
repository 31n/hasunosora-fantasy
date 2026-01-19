import { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { checkinApi } from '../../services/api';
import QuizModal from '../Quiz/QuizModal';
import SpotPopup from './SpotPopup';
import type { User, Spot, Area, CheckInResponse } from '../../types';
import { calculateDistance, formatDistance } from '../../utils/distance';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import FilterListIcon from '@mui/icons-material/FilterList';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface MapViewProps {
  user: User;
  spots: Spot[];
  areas: Area[];
}

export default function MapView({ user, spots, areas }: MapViewProps) {
  const [searchParams] = useSearchParams();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const userLocationRef = useRef<[number, number] | null>(null); // refを追加
  const watchPositionId = useRef<number | null>(null); // watchPositionのIDを保存
  const orientationEventType = useRef<'deviceorientationabsolute' | 'deviceorientation' | null>(null); // 登録されたイベントタイプ
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'available' | 'error'>('loading');
  const [userHeading, setUserHeading] = useState<number>(0);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [quizData, setQuizData] = useState<CheckInResponse | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [orientationPermissionNeeded, setOrientationPermissionNeeded] = useState(false);
  
  // フィルター表示状態
  const [showFilter, setShowFilter] = useState(false);
  
  // フィルター状態
  const [highlightQuizSpots, setHighlightQuizSpots] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  // スポットクリック処理を更新（マーカークリックでポップアップ表示のみ）
  const handleSpotClick = (spot: Spot) => {
    setSelectedSpot(spot);
  };

  // チェックイン処理を分離
  const handleCheckin = async () => {
    if (!selectedSpot) return;

    const currentLocation = userLocationRef.current;

    if (!currentLocation) {
      if (locationStatus === 'loading') {
        alert('位置情報を取得中です。しばらくお待ちください。');
      } else {
        alert('位置情報を取得できません。ブラウザの設定を確認してください。');
      }
      return;
    }

    try {
      const response = await checkinApi.checkin(
        user.user_id,
        selectedSpot.spot_id,
        currentLocation[1], // latitude
        currentLocation[0]  // longitude
      );

      alert(response.message || 'チェックイン完了！');
    } catch (error: any) {
      if (error.message.includes('OUT_OF_RANGE')) {
        alert('スポットから離れすぎています。スポットに近づいてください。');
      } else if (error.message.includes('ALREADY_CHECKED_IN')) {
        alert('既にチェックイン済みです。');
      } else {
        alert('エラーが発生しました: ' + error.message);
      }
    }
  };

  // クイズ挑戦処理を分離
  const handleQuizChallenge = async () => {
    if (!selectedSpot) return;

    const currentLocation = userLocationRef.current;

    if (!currentLocation) {
      if (locationStatus === 'loading') {
        alert('位置情報を取得中です。しばらくお待ちください。');
      } else {
        alert('位置情報を取得できません。ブラウザの設定を確認してください。');
      }
      return;
    }

    try {
      const response = await checkinApi.checkin(
        user.user_id,
        selectedSpot.spot_id,
        currentLocation[1], // latitude
        currentLocation[0]  // longitude
      );

      if (response.quiz_available && response.quiz) {
        setQuizData(response);
        setShowQuiz(true);
      } else {
        alert('クイズに挑戦できません: ' + (response.message || ''));
      }
    } catch (error: any) {
      if (error.message.includes('OUT_OF_RANGE')) {
        alert('スポットから離れすぎています。スポットに近づいてください。');
      } else if (error.message.includes('QUIZ_ON_COOLDOWN')) {
        alert('クイズの再挑戦にはクールダウン時間が必要です。しばらく経ってから再度お試しください。');
      } else {
        alert('エラーが発生しました: ' + error.message);
      }
    }
  };

  const handleDirections = () => {
    console.log('経路検索を開始');
  };

  // エリアでフィルタリングされたスポット
  const filteredSpots = useMemo(() => {
    let filtered = spots;
    
    // 制限エリアのフィルタリング（解放済みエリアのみ表示）
    const userUnlockedAreas = user.unlocked_areas || [];
    filtered = filtered.filter(spot => {
      if (!spot.area) return true; // エリアが設定されていないスポットは表示
      const area = areas.find(a => a.area_id === spot.area);
      if (!area) return true;
      // 制限ありのエリアで、解放済みでない場合は非表示
      if (area.is_restricted && !userUnlockedAreas.includes(area.area_id)) {
        return false;
      }
      return true;
    });
    
    // エリアフィルター
    if (user.selected_area) {
      filtered = filtered.filter(spot => spot.area === user.selected_area);
    }
    
    // ジャンルフィルター
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(spot => spot.genre?.includes(selectedGenre));
    }
    
    return filtered;
  }, [spots, user.selected_area, selectedGenre, user.unlocked_areas, areas]);
  
  // ジャンル一覧を取得（エリアでフィルタリングされたスポットから）
  const availableGenres = useMemo(() => {
    let baseSpots = spots;
    
    // 制限エリアのフィルタリング
    const userUnlockedAreas = user.unlocked_areas || [];
    baseSpots = baseSpots.filter(spot => {
      if (!spot.area) return true;
      const area = areas.find(a => a.area_id === spot.area);
      if (!area) return true;
      if (area.is_restricted && !userUnlockedAreas.includes(area.area_id)) {
        return false;
      }
      return true;
    });
    
    if (user.selected_area) {
      baseSpots = baseSpots.filter(spot => spot.area === user.selected_area);
    }
    
    return ['all', ...new Set(baseSpots.flatMap(s => s.genre || []))];
  }, [spots, user.selected_area, user.unlocked_areas, areas]);

  // 選択されたエリアの中心座標を取得
  const selectedAreaCenter = useMemo(() => {
    if (!user.selected_area) return null;
    const area = areas.find(a => a.area_id === user.selected_area);
    return area ? [area.center_longitude, area.center_latitude] as [number, number] : null;
  }, [user.selected_area, areas]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // URLパラメータからspotIdを取得
    const spotIdParam = searchParams.get('spotId');
    let initialCenter: [number, number] = selectedAreaCenter || [139.7454, 35.6586]; // エリア中心 or 東京タワー
    let initialZoom = 15;
    
    // spotIdが指定されている場合、そのスポットの位置を中心にする
    if (spotIdParam) {
      const targetSpot = spots.find(s => s.spot_id === spotIdParam);
      if (targetSpot) {
        initialCenter = [targetSpot.longitude, targetSpot.latitude];
        initialZoom = 17; // スポット表示時はズームを大きくする
        // スポットを選択状態にする
        setSelectedSpot(targetSpot);
      }
    }

    // 地図を初期化（日本語化）
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: initialZoom,
      language: 'ja' // 日本語化
    });

    // ナビゲーションコントロール（ズームボタン）を追加
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // 位置情報を取得
    if (navigator.geolocation) {
      console.log('位置情報の取得を開始します');
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('位置情報の取得に成功:', position.coords);
          const { latitude, longitude } = position.coords;
          const location: [number, number] = [longitude, latitude];
          
          // refと状態の両方を更新
          userLocationRef.current = location;
          setUserLocation(location);
          setLocationStatus('available');

          // spotIdが指定されていない場合のみ、ユーザーの位置に地図を移動
          if (!spotIdParam && map.current) {
            map.current.setCenter([longitude, latitude]);
          }

          if (map.current) {
            // 矢印型のマーカーを作成
            const el = document.createElement('div');
            el.className = 'user-location-marker';
            el.innerHTML = `
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
                  </filter>
                </defs>
                <circle cx="20" cy="20" r="18" fill="#3b82f6" opacity="0.2"/>
                <circle cx="20" cy="20" r="12" fill="#3b82f6" filter="url(#shadow)"/>
                <path d="M 20 8 L 24 18 L 20 16 L 16 18 Z" fill="white" filter="url(#shadow)"/>
              </svg>
            `;

            // ユーザー位置マーカーを作成
            userMarker.current = new mapboxgl.Marker({
              element: el,
              anchor: 'center',
              rotationAlignment: 'map',
              pitchAlignment: 'map'
            })
              .setLngLat([longitude, latitude])
              .addTo(map.current);

            // 方角の更新を監視
            const startOrientationTracking = async () => {
              // iOS 13+ の場合、許可が必要
              if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                try {
                  const permission = await (DeviceOrientationEvent as any).requestPermission();
                  if (permission === 'granted') {
                    setupOrientationListeners();
                  } else {
                    console.log('端末の向き取得が許可されませんでした');
                    setOrientationPermissionNeeded(true);
                  }
                } catch (error) {
                  console.error('向き許可リクエストエラー:', error);
                  setOrientationPermissionNeeded(true);
                }
              } else {
                // iOS 13未満または他のブラウザ
                setupOrientationListeners();
              }
            };

            const setupOrientationListeners = () => {
              if ('ondeviceorientationabsolute' in window) {
                orientationEventType.current = 'deviceorientationabsolute';
                window.addEventListener('deviceorientationabsolute', handleOrientation);
              } else if ('ondeviceorientation' in window) {
                orientationEventType.current = 'deviceorientation';
                window.addEventListener('deviceorientation', handleOrientation);
              }
            };

            startOrientationTracking();

            // 位置情報の継続的な更新
            const watchId = navigator.geolocation.watchPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                const newLocation: [number, number] = [longitude, latitude];
                
                // refと状態の両方を更新
                userLocationRef.current = newLocation;
                setUserLocation(newLocation);
                
                if (userMarker.current) {
                  userMarker.current.setLngLat(newLocation);
                }
              },
              (error) => {
                console.error('位置情報更新エラー:', error);
                // エラーでもuserLocationはnullにしない（既存の位置情報を保持）
              },
              { enableHighAccuracy: true, maximumAge: 0 }
            );
            watchPositionId.current = watchId;
          }
        },
        (error) => {
          console.error('位置情報取得エラー:', error);
          console.error('エラーコード:', error.code);
          console.error('エラーメッセージ:', error.message);
          setLocationStatus('error');
          
          // エラーメッセージを表示
          if (error.code === error.PERMISSION_DENIED) {
            alert('位置情報の使用が拒否されています。ブラウザの設定を確認してください。');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            alert('位置情報を取得できませんでした。');
          } else if (error.code === error.TIMEOUT) {
            alert('位置情報の取得がタイムアウトしました。再読み込みしてください。');
          }
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000,
          maximumAge: 0 
        }
      );
    } else {
      setLocationStatus('error');
      alert('このブラウザは位置情報に対応していません。');
    }

    return () => {
      // watchPositionを停止
      if (watchPositionId.current !== null) {
        navigator.geolocation.clearWatch(watchPositionId.current);
        watchPositionId.current = null;
      }
      
      // 登録されたイベントリスナーのみを削除
      if (orientationEventType.current) {
        window.removeEventListener(orientationEventType.current, handleOrientation);
        orientationEventType.current = null;
      }
      
      map.current?.remove();
    };
  }, [spots, searchParams]);

  // 方角が変わったときに矢印を回転
  useEffect(() => {
    if (userMarker.current) {
      const el = userMarker.current.getElement();
      // rotation プロパティを使用してマーカー自体を回転
      userMarker.current.setRotation(userHeading);
    }
  }, [userHeading]);

  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (event.alpha !== null) {
      // デバイスの向きを取得
      let heading = event.webkitCompassHeading || (360 - event.alpha);
      setUserHeading(heading);
    }
  };

  useEffect(() => {
    if (!map.current) return;

    // 既存のマーカーをクリア
    const markers: mapboxgl.Marker[] = [];

    // フィルタリングされたスポットにマーカーを追加
    filteredSpots.forEach((spot) => {
      const el = document.createElement('div');
      el.className = 'spot-marker';
      
      // 選択されたスポットかどうかをチェック
      const isSelected = selectedSpot?.spot_id === spot.spot_id;
      
      if (isSelected) {
        // 選択中のスポット：目立つオレンジ色
        el.style.backgroundColor = '#f97316';
        el.style.border = '4px solid #ea580c';
        el.style.width = '36px';
        el.style.height = '36px';
        el.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.6)';
        el.style.transform = 'scale(1.2)';
        el.style.zIndex = '1000';
      } else {
        // 強調表示が有効でクイズありの場合のみ黄色、それ以外は全てグレー
        const isHighlighted = highlightQuizSpots && spot.quiz;
        
        if (isHighlighted) {
          // 強調表示中のクイズあり：黄色
          el.style.backgroundColor = '#fbbf24';
          el.style.border = '3px solid #f59e0b';
        } else if (highlightQuizSpots && !spot.quiz) {
          // 強調表示中のクイズなし：グレー
          el.style.backgroundColor = '#9ca3af';
          el.style.border = '3px solid white';
        } else {
          // 通常表示（クイズの有無に関わらず同じ色）
          el.style.backgroundColor = '#14b8a6';
          el.style.border = '3px solid white';
        }
        
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.transform = 'scale(1)';
      }
      
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([spot.longitude, spot.latitude])
        .addTo(map.current!);

      markers.push(marker);

      // マーカークリック時に直接モーダルを開く
      el.addEventListener('click', (e) => {
        console.log('Marker clicked:', spot.spot_name);
        e.stopPropagation();
        handleSpotClick(spot);
      });
    });

    // クリーンアップ
    return () => {
      markers.forEach(marker => marker.remove());
    };
  }, [filteredSpots, highlightQuizSpots, selectedSpot]); // selectedSpotも依存配列に追加

  // エリア変更時に地図の中心を移動
  useEffect(() => {
    if (!map.current || !selectedAreaCenter) return;
    
    map.current.flyTo({
      center: selectedAreaCenter,
      zoom: 15,
      duration: 1500
    });
  }, [selectedAreaCenter]);

  // フィルターモーダルのEscapeキーハンドリング
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowFilter(false);
      }
    };

    if (showFilter) {
      window.addEventListener('keydown', handleEscape);
      return () => {
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showFilter]);

  const handleQuizClose = () => {
    setShowQuiz(false);
    setQuizData(null);
    setSelectedSpot(null);
  };

  const requestOrientationPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          if ('ondeviceorientationabsolute' in window) {
            orientationEventType.current = 'deviceorientationabsolute';
            window.addEventListener('deviceorientationabsolute', handleOrientation);
          } else if ('ondeviceorientation' in window) {
            orientationEventType.current = 'deviceorientation';
            window.addEventListener('deviceorientation', handleOrientation);
          }
          setOrientationPermissionNeeded(false);
        }
      } catch (error) {
        console.error('向き許可リクエストエラー:', error);
        alert('端末の向き取得の許可に失敗しました');
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', flex: 1, overflow: 'hidden' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      
      {/* フィルターボタン */}
      <button
        onClick={() => setShowFilter(true)}
        aria-label="表示フィルターを開く"
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          padding: '12px 16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          cursor: 'pointer',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        }}
        className="filter-button"
      >
        <FilterListIcon style={{ fontSize: '18px', marginRight: '4px' }} />
        フィルター
      </button>
      
      {/* フィルターモーダル */}
      {showFilter && (
        <>
          {/* バックドロップ */}
          <div
            onClick={() => setShowFilter(false)}
            role="presentation"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          />
          
          {/* フィルターウィンドウ */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            zIndex: 1001,
            width: 'calc(100% - 32px)',
            maxWidth: '480px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="filter-dialog-title"
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 id="filter-dialog-title" style={{ 
                margin: 0, 
                fontSize: '18px',
                fontWeight: '600',
                color: '#374151'
              }}>
                表示フィルター
              </h3>
              <button
                onClick={() => setShowFilter(false)}
                aria-label="フィルターを閉じる"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>
            
            {/* クイズ強調表示 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                cursor: 'pointer',
                padding: '12px',
                backgroundColor: highlightQuizSpots ? '#fef3c7' : '#f9fafb',
                borderRadius: '8px',
                border: '2px solid',
                borderColor: highlightQuizSpots ? '#fbbf24' : '#e5e7eb',
                transition: 'all 0.2s'
              }}>
                <input
                  type="checkbox"
                  checked={highlightQuizSpots}
                  onChange={(e) => setHighlightQuizSpots(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer'
                  }}
                />
                <span>クイズありスポットを強調表示</span>
              </label>
              {highlightQuizSpots && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#dbeafe',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#1e40af'
                }}>
                  💡 クイズありスポットが黄色で表示されます
                </div>
              )}
            </div>
            
            {/* ジャンルフィルター */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#6b7280',
                marginBottom: '8px'
              }}>
                ジャンル
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  backgroundColor: 'white'
                }}
              >
                <option value="all">すべて</option>
                {availableGenres.filter(g => g !== 'all').map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
            
            {/* 凡例 */}
            <div style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '12px' }}>
                凡例
              </div>
              {highlightQuizSpots ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#fbbf24',
                      border: '2px solid white',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                    }} />
                    <span style={{ fontSize: '14px', color: '#374151' }}>クイズあり (強調表示中)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#9ca3af',
                      border: '2px solid white',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                    }} />
                    <span style={{ fontSize: '14px', color: '#374151' }}>クイズなし</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#14b8a6',
                    border: '2px solid white',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }} />
                  <span style={{ fontSize: '14px', color: '#374151' }}>すべてのスポット</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* 位置情報ステータス表示 */}
      {locationStatus === 'loading' && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          backgroundColor: 'rgba(59, 130, 246, 0.9)',
          color: 'white',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <MyLocationIcon style={{ fontSize: '16px' }} />
          位置情報を取得中...
        </div>
      )}

      {locationStatus === 'error' && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          backgroundColor: 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          zIndex: 10
        }}>
          ⚠️ 位置情報を取得できません
        </div>
      )}

      {orientationPermissionNeeded && (
        <div style={{
          position: 'absolute',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 10,
          textAlign: 'center',
          maxWidth: '320px'
        }}>
          <p style={{ 
            fontSize: '14px', 
            color: '#374151',
            marginBottom: '12px',
            lineHeight: '1.5'
          }}>
            矢印の向きを端末の向きと合わせるには、センサーへのアクセスを許可してください
          </p>
          <button
            onClick={requestOrientationPermission}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            端末の向きを有効にする
          </button>
        </div>
      )}
      
      {/* スポットポップアップ */}
      {selectedSpot && userLocation && (
        <SpotPopup
          spot={selectedSpot}
          distance={calculateDistance(
            userLocation[1],
            userLocation[0],
            selectedSpot.latitude,
            selectedSpot.longitude
          )}
          onClose={() => setSelectedSpot(null)}
          onCheckin={handleCheckin}
          onQuiz={handleQuizChallenge}
          onDirections={handleDirections}
          isInRange={calculateDistance(
            userLocation[1],
            userLocation[0],
            selectedSpot.latitude,
            selectedSpot.longitude
          ) <= selectedSpot.detection_radius}
        />
      )}

      {showQuiz && quizData && selectedSpot && (
        <QuizModal
          user={user}
          spot={selectedSpot}
          quizData={quizData}
          onClose={handleQuizClose}
        />
      )}

      <style>{`
        .user-location-marker {
          width: 40px;
          height: 40px;
        }
        
        .user-location-marker svg {
          display: block;
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
        
        /* Mapboxポップアップの×ボタンを大きくしてタップしやすく */
        .mapboxgl-popup-close-button {
          width: 32px !important;
          height: 32px !important;
          font-size: 24px !important;
          line-height: 32px !important;
          padding: 0 !important;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .mapboxgl-popup-close-button:hover {
          background-color: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}