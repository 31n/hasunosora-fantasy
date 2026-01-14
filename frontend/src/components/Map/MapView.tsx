import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { checkinApi } from '../../services/api';
import QuizModal from '../Quiz/QuizModal';
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
  const [quizFilter, setQuizFilter] = useState<'all' | 'quiz-only' | 'no-quiz'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  // スポットクリック処理（useEffectの前に定義）
  const handleSpotClick = async (spot: Spot) => {
    setSelectedSpot(spot);

    // refから最新の位置情報を取得
    const currentLocation = userLocationRef.current;

    // デバッグ情報
    console.log('locationStatus:', locationStatus);
    console.log('userLocation (state):', userLocation);
    console.log('userLocation (ref):', currentLocation);

    // refの値を優先的にチェック
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
        spot.spot_id,
        currentLocation[1], // latitude
        currentLocation[0]  // longitude
      );

      if (response.quiz_available && response.quiz) {
        setQuizData(response);
        setShowQuiz(true);
      } else {
        alert(response.message || 'チェックイン完了！');
      }
    } catch (error: any) {
      if (error.message.includes('OUT_OF_RANGE')) {
        alert('スポットから離れすぎています。スポットに近づいてください。');
      } else {
        alert('エラーが発生しました: ' + error.message);
      }
    }
  };

  // エリアでフィルタリングされたスポット
  const filteredSpots = useMemo(() => {
    let filtered = spots;
    
    // エリアフィルター
    if (user.selected_area) {
      filtered = filtered.filter(spot => spot.area === user.selected_area);
    }
    
    // クイズフィルター
    if (quizFilter === 'quiz-only') {
      filtered = filtered.filter(spot => spot.quiz);
    } else if (quizFilter === 'no-quiz') {
      filtered = filtered.filter(spot => !spot.quiz);
    }
    
    // ジャンルフィルター
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(spot => spot.genre?.includes(selectedGenre));
    }
    
    return filtered;
  }, [spots, user.selected_area, quizFilter, selectedGenre]);
  
  // ジャンル一覧を取得（エリアでフィルタリングされたスポットから）
  const availableGenres = useMemo(() => {
    let baseSpots = spots;
    if (user.selected_area) {
      baseSpots = baseSpots.filter(spot => spot.area === user.selected_area);
    }
    return ['all', ...new Set(baseSpots.flatMap(s => s.genre || []))];
  }, [spots, user.selected_area]);

  // 選択されたエリアの中心座標を取得
  const selectedAreaCenter = useMemo(() => {
    if (!user.selected_area) return null;
    const area = areas.find(a => a.area_id === user.selected_area);
    return area ? [area.center_longitude, area.center_latitude] as [number, number] : null;
  }, [user.selected_area, areas]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // 地図の初期中心座標を決定
    const initialCenter = selectedAreaCenter || [139.7454, 35.6586]; // エリア中心 or 東京タワー

    // 地図を初期化（日本語化）
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: 15, // ズームレベルを大きく（12→15）
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

          if (map.current) {
            map.current.setCenter([longitude, latitude]);

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
  }, []);

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
      // クイズの有無で色を変える
      el.style.backgroundColor = spot.quiz ? '#ef4444' : '#9ca3af';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([spot.longitude, spot.latitude])
        .addTo(map.current!);

      markers.push(marker);

      // ポップアップを作成（ボタン付き）
      const popupContent = document.createElement('div');
      popupContent.style.padding = '8px';
      popupContent.style.minWidth = '200px';
      
      const title = document.createElement('div');
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '8px';
      title.textContent = spot.spot_name;
      popupContent.appendChild(title);

      // 距離表示用のdiv
      const distanceDiv = document.createElement('div');
      distanceDiv.style.fontSize = '12px';
      distanceDiv.style.color = '#666';
      distanceDiv.style.marginBottom = '8px';
      popupContent.appendChild(distanceDiv);

      // チェックインボタン
      const checkinButton = document.createElement('button');
      checkinButton.textContent = 'チェックイン';
      checkinButton.style.width = '100%';
      checkinButton.style.padding = '8px 16px';
      checkinButton.style.borderRadius = '6px';
      checkinButton.style.border = 'none';
      checkinButton.style.fontWeight = '600';
      checkinButton.style.cursor = 'pointer';
      checkinButton.style.transition = 'background-color 0.2s';
      
      // 距離チェックとボタンスタイルの更新
      const updateButtonState = () => {
        const currentLocation = userLocationRef.current;
        if (!currentLocation) {
          checkinButton.disabled = true;
          checkinButton.style.backgroundColor = '#d1d5db';
          checkinButton.style.color = '#9ca3af';
          distanceDiv.textContent = '位置情報を取得中...';
          return;
        }

        const distance = calculateDistance(
          currentLocation[1], // latitude
          currentLocation[0], // longitude
          spot.latitude,
          spot.longitude
        );

        distanceDiv.textContent = `距離: ${formatDistance(distance)}`;

        if (distance <= spot.detection_radius) {
          checkinButton.disabled = false;
          checkinButton.style.backgroundColor = '#3b82f6';
          checkinButton.style.color = 'white';
          checkinButton.onmouseover = () => {
            if (!checkinButton.disabled) {
              checkinButton.style.backgroundColor = '#2563eb';
            }
          };
          checkinButton.onmouseout = () => {
            if (!checkinButton.disabled) {
              checkinButton.style.backgroundColor = '#3b82f6';
            }
          };
        } else {
          checkinButton.disabled = true;
          checkinButton.style.backgroundColor = '#d1d5db';
          checkinButton.style.color = '#9ca3af';
          checkinButton.style.cursor = 'not-allowed';
          distanceDiv.textContent += ' (範囲外)';
        }
      };

      // 初期状態を設定
      updateButtonState();

      // ボタンクリック時の処理
      checkinButton.onclick = (e) => {
        console.log('Checkin button clicked:', spot.spot_name);
        e.stopPropagation();
        handleSpotClick(spot);
        popup.remove();
      };

      popupContent.appendChild(checkinButton);

      const popup = new mapboxgl.Popup({ 
        offset: 25,
        closeButton: true,
        closeOnClick: false
      })
        .setDOMContent(popupContent);

      // ポップアップが開かれたときに状態を更新
      popup.on('open', () => {
        console.log('Popup opened for:', spot.spot_name);
        updateButtonState();
      });
      
      marker.setPopup(popup);

      // マーカークリック時にポップアップを開く
      el.addEventListener('click', (e) => {
        console.log('Marker clicked:', spot.spot_name);
        e.stopPropagation();
        marker.togglePopup();
      });
    });

    // クリーンアップ
    return () => {
      markers.forEach(marker => marker.remove());
    };
  }, [filteredSpots]); // filteredSpotsに変更

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
      if (e.key === 'Escape' && showFilter) {
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
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      
      {/* フィルターボタン */}
      <button
        onClick={() => setShowFilter(true)}
        aria-label="表示フィルターを開く"
        style={{
          position: 'absolute',
          bottom: '80px',
          right: '20px',
          width: '56px',
          height: '56px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          cursor: 'pointer',
          zIndex: 998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s, box-shadow 0.2s'
        }}
        className="filter-button"
      >
        <FilterListIcon style={{ fontSize: '28px' }} />
      </button>
      
      {/* フィルターモーダル */}
      {showFilter && (
        <>
          {/* バックドロップ */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowFilter(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter') {
                setShowFilter(false);
              }
            }}
            aria-label="フィルターを閉じる"
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
            minWidth: '320px',
            maxWidth: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ 
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
            
            {/* クイズフィルター */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#6b7280',
                marginBottom: '8px'
              }}>
                クイズ有無
              </label>
              <select
                value={quizFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'all' || value === 'quiz-only' || value === 'no-quiz') {
                    setQuizFilter(value);
                  }
                }}
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
                <option value="all">すべて表示</option>
                <option value="quiz-only">クイズあり</option>
                <option value="no-quiz">クイズなし</option>
              </select>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  border: '2px solid white',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }} />
                <span style={{ fontSize: '14px', color: '#374151' }}>クイズあり</span>
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
        
        .filter-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        
        .filter-button:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}