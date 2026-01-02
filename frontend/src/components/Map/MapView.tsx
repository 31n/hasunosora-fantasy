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
  const spotMarkers = useRef<mapboxgl.Marker[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number>(0);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [quizData, setQuizData] = useState<CheckInResponse | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  // 地図の初期化
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // 地図を初期化（日本語化）
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [139.7454, 35.6586], // 東京タワー
      zoom: 15,
      language: 'ja'
    });

    // ナビゲーションコントロール（ズームボタン）を追加
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // 位置情報を取得
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation: [number, number] = [longitude, latitude];
          setUserLocation(newLocation);

          if (map.current) {
            map.current.setCenter(newLocation);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        { enableHighAccuracy: true }
      );

      // 位置情報の継続的な更新
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation: [number, number] = [longitude, latitude];
          setUserLocation(newLocation);
        },
        (error) => console.error('位置情報更新エラー:', error),
        { enableHighAccuracy: true, maximumAge: 0 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, []);

  // ユーザー位置マーカーの作成・更新
  useEffect(() => {
    if (!map.current || !userLocation) return;

    if (!userMarker.current) {
      // マーカーを新規作成
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

      userMarker.current = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
        rotationAlignment: 'map',
        pitchAlignment: 'map'
      })
        .setLngLat(userLocation)
        .addTo(map.current);
    } else {
      // 既存のマーカーの位置を更新
      userMarker.current.setLngLat(userLocation);
    }

    // 方角の更新を監視
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation);
    } else if ('ondeviceorientation' in window) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [userLocation]);

  // マーカーの回転を更新
  useEffect(() => {
    if (userMarker.current) {
      userMarker.current.setRotation(userHeading);
    }
  }, [userHeading]);

  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (event.alpha !== null) {
      let heading = event.webkitCompassHeading || (360 - event.alpha);
      setUserHeading(heading);
    }
  };

  // スポットマーカーの作成・更新
  useEffect(() => {
    if (!map.current) {
      console.log('Map not initialized');
      return;
    }

    // 地図が完全に読み込まれるまで待つ
    const addMarkers = () => {
      console.log('Adding markers for spots:', spots.length);
      
      // 既存のマーカーをクリア
      spotMarkers.current.forEach(marker => marker.remove());
      spotMarkers.current = [];

      // スポットマーカーを追加
      spots.forEach((spot) => {
        console.log('Adding marker for spot:', spot.spot_name, 'at', [spot.longitude, spot.latitude]);
        
        const el = document.createElement('div');
        el.className = 'spot-marker';
        el.innerHTML = `
          <div style="
            background-color: #ef4444;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            transition: transform 0.2s;
          "></div>
        `;

        try {
          // Mapboxのマーカーを作成（rotationAlignmentとpitchAlignmentを追加）
          const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'center',
            rotationAlignment: 'map',
            pitchAlignment: 'map'
          })
            .setLngLat([spot.longitude, spot.latitude])
            .addTo(map.current!);

          console.log('Marker added successfully');
          spotMarkers.current.push(marker);

          // クリックイベント
          el.addEventListener('click', () => {
            handleSpotClick(spot);
          });

          // ホバーエフェクト
          const innerDiv = el.querySelector('div') as HTMLElement;
          if (innerDiv) {
            el.addEventListener('mouseenter', () => {
              innerDiv.style.transform = 'scale(1.2)';
            });
            el.addEventListener('mouseleave', () => {
              innerDiv.style.transform = 'scale(1)';
            });
          }

          // ポップアップを追加
          const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<div style="padding: 4px 8px;"><strong>${spot.spot_name}</strong></div>`);
          
          marker.setPopup(popup);
        } catch (error) {
          console.error('Error adding marker:', error);
        }
      });
      
      console.log('Total markers added:', spotMarkers.current.length);
    };

    // 地図が読み込まれているか確認
    if (map.current.loaded()) {
      console.log('Map already loaded, adding markers');
      addMarkers();
    } else {
      console.log('Waiting for map to load');
      map.current.once('load', () => {
        console.log('Map loaded, adding markers');
        addMarkers();
      });
    }

    // クリーンアップ関数
    return () => {
      console.log('Cleaning up markers');
      spotMarkers.current.forEach(marker => marker.remove());
      spotMarkers.current = [];
    };
  }, [spots]);

  // 地図のクリーンアップ
  useEffect(() => {
    return () => {
      if (userMarker.current) {
        userMarker.current.remove();
      }
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  const handleSpotClick = async (spot: Spot) => {
    setSelectedSpot(spot);

    if (!userLocation) {
      alert('位置情報を取得できません');
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
        alert('スポットに近づいてください');
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
      
      {/* デバッグ情報 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 1000
      }}>
        <div>スポット数: {spots.length}</div>
        <div>マーカー数: {spotMarkers.current.length}</div>
        {userLocation && (
          <div>現在地: {userLocation[1].toFixed(4)}, {userLocation[0].toFixed(4)}</div>
        )}
      </div>
      
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

        .spot-marker {
          /* transitionを削除してパフォーマンス向上 */
        }

        /* Mapboxのマーカーが正しく配置されるように */
        .mapboxgl-marker {
          position: absolute !important;
          will-change: transform;
        }

        .mapboxgl-canvas-container {
          position: relative !important;
        }
        
        /* ハードウェアアクセラレーションを有効化 */
        .mapboxgl-map {
          transform: translateZ(0);
        }
      `}</style>
    </div>
  );
}