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
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [quizData, setQuizData] = useState<CheckInResponse | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    // 地図を初期化
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [139.7454, 35.6586], // 東京タワー
      zoom: 12,
    });

    // 位置情報を取得
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([longitude, latitude]);

          if (map.current) {
            map.current.setCenter([longitude, latitude]);

            // ユーザー位置マーカー
            new mapboxgl.Marker({ color: '#3b82f6' })
              .setLngLat([longitude, latitude])
              .addTo(map.current);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }

    return () => {
      map.current?.remove();
    };
  }, []);

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

      const marker = new mapboxgl.Marker(el)
        .setLngLat([spot.longitude, spot.latitude])
        .addTo(map.current!);

      // クリックイベント
      el.addEventListener('click', () => {
        handleSpotClick(spot);
      });
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
    </div>
  );
}
