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

          if (map.current) {
            map.current.setCenter([longitude, latitude]);

            // 矢印型のマーカーを作成
            const el = document.createElement('div');
            el.className = 'user-location-marker';
            el.style.width = '40px';
            el.style.height = '40px';
            el.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z'/%3E%3C/svg%3E")`;
            el.style.backgroundSize = 'contain';
            el.style.backgroundRepeat = 'no-repeat';
            el.style.backgroundPosition = 'center';
            el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';

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
                setUserLocation([longitude, latitude]);
                if (userMarker.current) {
                  userMarker.current.setLngLat([longitude, latitude]);
                }
              },
              (error) => console.error('位置情報更新エラー:', error),
              { enableHighAccuracy: true, maximumAge: 0 }
            );
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        { enableHighAccuracy: true }
      );
    }

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      window.removeEventListener('deviceorientation', handleOrientation);
      map.current?.remove();
    };
  }, []);

  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (userMarker.current && event.alpha !== null) {
      // デバイスの向きに応じてマーカーを回転
      const heading = event.webkitCompassHeading || event.alpha;
      const rotation = 360 - heading;
      const el = userMarker.current.getElement();
      el.style.transform = `rotate(${rotation}deg)`;
    }
  };

  useEffect(() => {
    if (!map.current) return;

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

      // クリックイベント
      el.addEventListener('click', () => {
        handleSpotClick(spot);
      });

      // ポップアップを追加
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`<div style="padding: 4px 8px;"><strong>${spot.spot_name}</strong></div>`);
      
      marker.setPopup(popup);
    });
  }, [spots]);

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
          transition: transform 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}