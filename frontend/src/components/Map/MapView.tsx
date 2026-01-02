import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { checkinApi } from '../../services/api';
import QuizModal from '../Quiz/QuizModal';
import type { User, Spot, CheckInResponse } from '../../types';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface MapViewProps {
  user: User;
  spots: Spot[];
}

export default function MapView({ user, spots }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'available' | 'error'>('loading');
  const [userHeading, setUserHeading] = useState<number>(0);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [quizData, setQuizData] = useState<CheckInResponse | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    // 地図を初期化（日本語化）
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [139.7454, 35.6586], // 東京タワー
      zoom: 15, // ズームレベルを大きく（12→15）
      language: 'ja' // 日本語化
    });

    // ナビゲーションコントロール（ズームボタン）を追加
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // 位置情報を取得
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([longitude, latitude]);
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
            if ('ondeviceorientationabsolute' in window) {
              window.addEventListener('deviceorientationabsolute', handleOrientation);
            } else if ('ondeviceorientation' in window) {
              window.addEventListener('deviceorientation', handleOrientation);
            }

            // 位置情報の継続的な更新
            navigator.geolocation.watchPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                const newLocation: [number, number] = [longitude, latitude];
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
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationStatus('error');
          
          // エラーメッセージを表示
          if (error.code === error.PERMISSION_DENIED) {
            alert('位置情報の使用が拒否されています。ブラウザの設定を確認してください。');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            alert('位置情報を取得できませんでした。');
          } else if (error.code === error.TIMEOUT) {
            alert('位置情報の取得がタイムアウトしました。');
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationStatus('error');
      alert('このブラウザは位置情報に対応していません。');
    }

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      window.removeEventListener('deviceorientation', handleOrientation);
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

    // スポットマーカーを追加
    spots.forEach((spot) => {
      const el = document.createElement('div');
      el.className = 'spot-marker';
      el.style.backgroundColor = '#ef4444';
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

      // クリックイベント
      el.addEventListener('click', () => {
        handleSpotClick(spot);
      });

      // ポップアップを追加
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`<div style="padding: 4px 8px;"><strong>${spot.spot_name}</strong></div>`);
      
      marker.setPopup(popup);
    });

    // クリーンアップ
    return () => {
      markers.forEach(marker => marker.remove());
    };
  }, [spots]);

  const handleSpotClick = async (spot: Spot) => {
    setSelectedSpot(spot);

    // 位置情報の状態チェック
    if (locationStatus === 'loading') {
      alert('位置情報を取得中です。しばらくお待ちください。');
      return;
    }

    if (locationStatus === 'error' || !userLocation) {
      alert('位置情報を取得できません。ブラウザの設定を確認してください。');
      return;
    }

    try {
      const response = await checkinApi.checkin(
        user.user_id,
        spot.spot_id,
        userLocation[1],
        userLocation[0]
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

  const handleQuizClose = () => {
    setShowQuiz(false);
    setQuizData(null);
    setSelectedSpot(null);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      
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
          zIndex: 10
        }}>
          📍 位置情報を取得中...
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
      `}</style>
    </div>
  );
}