import { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { checkinApi, userApi } from '../../services/api';
import QuizModal from '../Quiz/QuizModal';
import SpotPopup from './SpotPopup';
import CheckinAnimation from '../Common/CheckinAnimation';
import type { User, Spot, Area, CheckInResponse, QuizType } from '../../types';
import { calculateDistance, formatDistance } from '../../utils/distance';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import FilterListIcon from '@mui/icons-material/FilterList';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface MapViewProps {
  user: User;
  spots: Spot[];
  areas: Area[];
  quizTypes?: QuizType[];
}

export default function MapView({ user, spots, areas, quizTypes = [] }: MapViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const userLocationRef = useRef<[number, number] | null>(null); // refを追加
  const watchPositionId = useRef<number | null>(null); // watchPositionのIDを保存
  const orientationEventType = useRef<'deviceorientationabsolute' | 'deviceorientation' | null>(null); // 登録されたイベントタイプ
  const prevSelectedAreaRef = useRef<string | null | undefined>(undefined); // エリアID変更追跡用
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'available' | 'error'>('loading');
  const [userHeading, setUserHeading] = useState<number>(0);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [quizData, setQuizData] = useState<CheckInResponse | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizReadOnly, setQuizReadOnly] = useState(false);
  const [showCheckinAnimation, setShowCheckinAnimation] = useState(false);
  const [orientationPermissionNeeded, setOrientationPermissionNeeded] = useState(false);
  const checkinAnimationTimer = useRef<number | null>(null);
  
  // フィルター表示状態
  const [showFilter, setShowFilter] = useState(false);
  
  // フィルター状態（sessionStorage から復元）
  const MAP_FILTER_SESSION_KEY = 'mapFilterState';
  const _savedFilter = (() => {
    try {
      const s = sessionStorage.getItem(MAP_FILTER_SESSION_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  })();
  const [highlightQuizSpots, setHighlightQuizSpots] = useState<boolean>(_savedFilter?.highlightQuizSpots ?? false);
  const [selectedGenre, setSelectedGenre] = useState<string>(_savedFilter?.selectedGenre ?? 'all');
  const [showTodayCheckinMark, setShowTodayCheckinMark] = useState<boolean>(_savedFilter?.showTodayCheckinMark ?? false);
  const [showAllCheckinMark, setShowAllCheckinMark] = useState<boolean>(_savedFilter?.showAllCheckinMark ?? false);

  // チェックイン履歴（マーク表示フィルター用）
  const [allCheckinHistory, setAllCheckinHistory] = useState<import('../../types').CheckInHistory[] | null>(null);

  // チェックイン・クイズのクールダウン状態
  const CHECKIN_COOLDOWN_MINUTES = 5;
  const [checkinStatus, setCheckinStatus] = useState<'none' | 'cooldown' | 'today'>('none');
  const [isQuizOnCooldown, setIsQuizOnCooldown] = useState(false);

  // スポットのチェックイン・クイズステータスを確認
  const checkSpotStatus = async (spotId: string) => {
    const normalize = (s: string) => /Z|[+-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z';
    try {
      const historyData = await userApi.getHistory(user.user_id, 100);
      const spotHistory = historyData.checkins.filter(h => h.spot_id === spotId);
      if (spotHistory.length > 0) {
        const sorted = [...spotHistory].sort((a, b) =>
          new Date(normalize(b.checked_in_at)).getTime() - new Date(normalize(a.checked_in_at)).getTime()
        );
        const mostRecentTime = new Date(normalize(sorted[0].checked_in_at));
        const now = new Date();
        const minutesSince = (now.getTime() - mostRecentTime.getTime()) / 60000;
        if (minutesSince <= CHECKIN_COOLDOWN_MINUTES) {
          setCheckinStatus('cooldown');
        } else {
          // 当日（JST）にチェックイン済みか確認
          const jstNow = new Date(now.getTime() + 9 * 3600000);
          const jstCheckin = new Date(mostRecentTime.getTime() + 9 * 3600000);
          if (jstNow.toISOString().slice(0, 10) === jstCheckin.toISOString().slice(0, 10)) {
            setCheckinStatus('today');
          } else {
            setCheckinStatus('none');
          }
        }
      } else {
        setCheckinStatus('none');
      }
    } catch (error) {
      console.error('チェックインステータス確認エラー:', error);
    }
    try {
      const spot = spots.find(s => s.spot_id === spotId);
      if (spot?.quizzes?.length > 0) {
        const cooldownData = await checkinApi.checkCooldown(user.user_id, spotId);
        setIsQuizOnCooldown(cooldownData.on_cooldown);
      }
    } catch (error) {
      console.error('クイズクールダウン確認エラー:', error);
    }
  };

  // スポット選択時にステータスを確認
  useEffect(() => {
    if (selectedSpot) {
      // 新しいスポットを開く前にリセット
      setCheckinStatus('none');
      setIsQuizOnCooldown(false);
      checkSpotStatus(selectedSpot.spot_id);
    } else {
      setCheckinStatus('none');
      setIsQuizOnCooldown(false);
    }
  }, [selectedSpot?.spot_id]);

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

      // 既存タイマーをクリア
      if (checkinAnimationTimer.current !== null) {
        window.clearTimeout(checkinAnimationTimer.current);
        checkinAnimationTimer.current = null;
      }

      // チェックイン成功時にアニメーションを表示
      setShowCheckinAnimation(true);
      // 即座にクールダウン状態にして連打を防ぐ
      setCheckinStatus('cooldown');
      // バックグラウンドでステータスを再確認（今日チェックイン済み等に更新）
      checkSpotStatus(selectedSpot.spot_id);
      // チェックインマークフィルターが有効な場合、履歴を再取得して即反映
      if (showTodayCheckinMark || showAllCheckinMark) {
        userApi.getHistory(user.user_id, 1000).then(data => {
          setAllCheckinHistory(data.checkins);
        }).catch(e => console.error('チェックイン履歴取得エラー:', e));
      }

      // アラート表示前にアニメーションを確実に閉じる（モバイルのブロッキング対策）
      checkinAnimationTimer.current = window.setTimeout(() => {
        setShowCheckinAnimation(false);
        checkinAnimationTimer.current = null;
      }, 1200);

    } catch (error: any) {
      if (error.message.includes('OUT_OF_RANGE')) {
        alert('スポットから離れすぎています。スポットに近づいてください。');
      } else if (error.message.includes('CHECKIN_ON_COOLDOWN')) {
        alert('連続チェックインはできません。少し時間を空けて再挑戦してください。');
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

    // クールタイム中の場合、APIを呼ばずに閲覧専用でクイズを表示
    if (isQuizOnCooldown) {
      const quiz =
        selectedSpot.quizzes?.find(q => q.quiz_type_id === (user.selected_quiz_type ?? null)) ??
        selectedSpot.quizzes?.find(q => q.quiz_type_id === null) ??
        selectedSpot.quizzes?.[0];
      if (quiz) {
        setQuizData({
          score_earned: 0,
          total_score: user.total_score,
          already_scored_today: true,
          quiz_available: true,
          quiz: {
            question: quiz.question,
            choices: quiz.choices,
            score: quiz.score,
            correct_answer: quiz.correct_answer,
          } as any,
        });
        setQuizReadOnly(true);
        setShowQuiz(true);
      }
      return;
    }

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
      const response = await checkinApi.quizChallenge(
        user.user_id,
        selectedSpot.spot_id,
        currentLocation[1], // latitude
        currentLocation[0]  // longitude
      );

      if (response.quiz_available && response.quiz) {
        setQuizData(response as any);
        setShowQuiz(true);
      } else {
        alert('クイズに挑戦できません。');
      }
    } catch (error: any) {
      if (error.message.includes('OUT_OF_RANGE')) {
        alert('スポットから離れすぎています。スポットに近づいてください。');
      } else if (error.message.includes('QUIZ_NOT_AVAILABLE')) {
        alert('このスポットにはクイズが登録されていません。');
      } else if (error.message.includes('QUIZ_ALREADY_ANSWERED_TODAY')) {
        // 選択中スポットのクイズデータを閲覧専用で表示
        const quiz =
          selectedSpot.quizzes?.find(q => q.quiz_type_id === (user.selected_quiz_type ?? null)) ??
          selectedSpot.quizzes?.find(q => q.quiz_type_id === null) ??
          selectedSpot.quizzes?.[0];
        if (quiz) {
          setQuizData({
            score_earned: 0,
            total_score: user.total_score,
            already_scored_today: true,
            quiz_available: true,
            quiz: {
              question: quiz.question,
              choices: quiz.choices,
              score: quiz.score,
              correct_answer: quiz.correct_answer,
            } as any,
          });
          setQuizReadOnly(true);
          setShowQuiz(true);
        } else {
          alert('本日はすでにクイズに回答済みです。明日また挑戦できます。');
        }
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

  // チェックイン済みスポットID（当日 / 全期間）
  const normalize = (s: string) => /Z|[+-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z';
  const todayCheckinSpotIds = useMemo(() => {
    if (!allCheckinHistory) return new Set<string>();
    const now = new Date();
    const jstToday = new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
    return new Set(
      allCheckinHistory
        .filter(h => {
          const jstCheckin = new Date(new Date(normalize(h.checked_in_at)).getTime() + 9 * 3600000)
            .toISOString().slice(0, 10);
          return jstCheckin === jstToday;
        })
        .map(h => h.spot_id)
    );
  }, [allCheckinHistory]);

  const allCheckinSpotIds = useMemo(() => {
    if (!allCheckinHistory) return new Set<string>();
    return new Set(allCheckinHistory.map(h => h.spot_id));
  }, [allCheckinHistory]);

  // 選択されたエリアの中心座標を取得
  const selectedAreaCenter = useMemo(() => {
    if (!user.selected_area) return null;
    const area = areas.find(a => a.area_id === user.selected_area);
    return area ? [area.center_longitude, area.center_latitude] as [number, number] : null;
  }, [user.selected_area, areas]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // 地図の初期中心座標を決定（エリア中心またはデフォルト）
    const initialCenter = selectedAreaCenter || [139.7454, 35.6586];
    const initialZoom = 15;

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
          const spotIdParam = searchParams.get('spotId');
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
                (window as any).addEventListener('deviceorientationabsolute', handleOrientation);
              } else if ('ondeviceorientation' in window) {
                orientationEventType.current = 'deviceorientation';
                (window as any).addEventListener('deviceorientation', handleOrientation);
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
  }, []); // 初回のみ実行

  useEffect(() => {
    return () => {
      if (checkinAnimationTimer.current !== null) {
        window.clearTimeout(checkinAnimationTimer.current);
        checkinAnimationTimer.current = null;
      }
    };
  }, []);

  // spotIdパラメータが変更されたときに地図の中心を移動
  useEffect(() => {
    if (!map.current) return;

    const spotIdParam = searchParams.get('spotId');
    
    if (spotIdParam) {
      const targetSpot = spots.find(s => s.spot_id === spotIdParam);
      
      if (targetSpot) {
        // ポップアップが下から表示されるため、スポットが隠れないよう bottom padding を設定
        const popupPadding = { top: 0, bottom: 280, left: 0, right: 0 };
        // 地図がロード完了後に移動
        if (map.current.isStyleLoaded()) {
          map.current.jumpTo({
            center: [targetSpot.longitude, targetSpot.latitude],
            zoom: 17,
            padding: popupPadding
          });
          setSelectedSpot(targetSpot);
        } else {
          // 地図のロードを待ってから移動
          map.current.once('load', () => {
            if (map.current) {
              map.current.jumpTo({
                center: [targetSpot.longitude, targetSpot.latitude],
                zoom: 17,
                padding: popupPadding
              });
              setSelectedSpot(targetSpot);
            }
          });
        }
      }
    }
  }, [searchParams, spots]);

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

      // チェックイン可能距離内かどうかをチェック
      const isInRange = userLocation !== null &&
        calculateDistance(userLocation[1], userLocation[0], spot.latitude, spot.longitude)
          <= spot.detection_radius;
      
      const isTodayCheckin = showTodayCheckinMark && todayCheckinSpotIds.has(spot.spot_id);
      const isAllTimeCheckin = showAllCheckinMark && allCheckinSpotIds.has(spot.spot_id);
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';

      if (isSelected) {
        // 1. 選択中のスポット：目立つオレンジ色
        el.style.backgroundColor = '#f97316';
        el.style.border = '4px solid #ea580c';
        el.style.width = '36px';
        el.style.height = '36px';
        el.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.6)';
        el.style.transform = 'scale(1.2)';
        el.style.zIndex = '1000';
      } else if (isTodayCheckin) {
        // 2. 当日チェックイン済み：濃い緑 + チェックマーク
        el.style.backgroundColor = '#16a34a';
        el.style.border = '3px solid #15803d';
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.transform = 'scale(1)';
        el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
      } else if (isAllTimeCheckin) {
        // 3. 過去チェックイン済み：青 + チェックマーク
        el.style.backgroundColor = '#0ea5e9';
        el.style.border = '3px solid #0284c7';
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.transform = 'scale(1)';
        el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
      } else if (isInRange) {
        // 4. チェックイン圏内：緑 + パルスアニメーション
        el.style.backgroundColor = '#22c55e';
        el.style.border = '3px solid #16a34a';
        el.style.width = '34px';
        el.style.height = '34px';
        el.style.transform = 'scale(1.1)';
        el.style.zIndex = '500';
        el.classList.add('spot-marker-in-range');
      } else {
        // 5. 通常表示
        const isHighlighted = highlightQuizSpots && spot.quizzes?.length > 0;
        if (isHighlighted) {
          el.style.backgroundColor = '#fbbf24';
          el.style.border = '3px solid #f59e0b';
        } else if (highlightQuizSpots && !spot.quizzes?.length) {
          el.style.backgroundColor = '#9ca3af';
          el.style.border = '3px solid white';
        } else {
          el.style.backgroundColor = '#76C3B7';
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
  }, [filteredSpots, highlightQuizSpots, selectedSpot, userLocation, showTodayCheckinMark, showAllCheckinMark, todayCheckinSpotIds, allCheckinSpotIds]); // selectedSpot, userLocationも依存配列に追加

  // エリア変更時に地図の中心を移動（再読み込みによる areas 参照更新では発火しない）
  useEffect(() => {
    const currentAreaId = user.selected_area ?? null;

    // エリアIDが前回と同じなら移動しない（再読み込み時など）
    if (prevSelectedAreaRef.current === currentAreaId) return;

    const isFirstRun = prevSelectedAreaRef.current === undefined;
    prevSelectedAreaRef.current = currentAreaId;

    // 初回マウント時はマップ初期化で既に中心設定済みのため移動しない
    if (isFirstRun) return;

    if (!map.current || !selectedAreaCenter) return;

    map.current.flyTo({
      center: selectedAreaCenter,
      zoom: 15,
      duration: 1500
    });
  }, [user.selected_area, selectedAreaCenter]);

  // チェックインマークフィルターが有効になったとき履歴を取得
  useEffect(() => {
    if (showTodayCheckinMark || showAllCheckinMark) {
      userApi.getHistory(user.user_id, 1000).then(data => {
        setAllCheckinHistory(data.checkins);
      }).catch(e => console.error('チェックイン履歴取得エラー:', e));
    }
  }, [showTodayCheckinMark, showAllCheckinMark]);

  // フィルター状態をsessionStorageに保存
  useEffect(() => {
    try {
      sessionStorage.setItem(MAP_FILTER_SESSION_KEY, JSON.stringify({
        highlightQuizSpots,
        selectedGenre,
        showTodayCheckinMark,
        showAllCheckinMark,
      }));
    } catch { /* ignore */ }
  }, [highlightQuizSpots, selectedGenre, showTodayCheckinMark, showAllCheckinMark]);

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
    setQuizReadOnly(false);
    setSelectedSpot(null);
    // URLパラメータからspotIdを削除
    const params = new URLSearchParams(searchParams);
    params.delete('spotId');
    setSearchParams(params);
  };

  const requestOrientationPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          if ('ondeviceorientationabsolute' in window) {
            orientationEventType.current = 'deviceorientationabsolute';
            (window as any).addEventListener('deviceorientationabsolute', handleOrientation);
          } else if ('ondeviceorientation' in window) {
            orientationEventType.current = 'deviceorientation';
            (window as any).addEventListener('deviceorientation', handleOrientation);
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
      
      {/* 現在地ボタン */}
      <button
        onClick={() => {
          if (!map.current || !userLocationRef.current) return;
          map.current.flyTo({
            center: userLocationRef.current,
            zoom: 17,
            duration: 800
          });
        }}
        aria-label="現在地に移動"
        style={{
          position: 'absolute',
          bottom: '80px',
          right: '20px',
          width: '48px',
          height: '48px',
          backgroundColor: userLocation ? 'white' : '#e5e7eb',
          color: userLocation ? '#3b82f6' : '#9ca3af',
          border: 'none',
          borderRadius: '50%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          cursor: userLocation ? 'pointer' : 'default',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          if (userLocation) {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.25)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        }}
      >
        <MyLocationIcon style={{ fontSize: '22px' }} />
      </button>

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

            {/* 当日チェックインマーク */}
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
                backgroundColor: showTodayCheckinMark ? '#dcfce7' : '#f9fafb',
                borderRadius: '8px',
                border: '2px solid',
                borderColor: showTodayCheckinMark ? '#16a34a' : '#e5e7eb',
                transition: 'all 0.2s'
              }}>
                <input
                  type="checkbox"
                  checked={showTodayCheckinMark}
                  onChange={(e) => setShowTodayCheckinMark(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span>当日チェックインしたスポットをマーク</span>
              </label>
              {showTodayCheckinMark && (
                <div style={{
                  marginTop: '8px', padding: '8px 12px',
                  backgroundColor: '#dcfce7', borderRadius: '6px',
                  fontSize: '12px', color: '#15803d'
                }}>
                  ✅ 本日チェックイン済みのスポットが緑のチェックマークで表示されます
                </div>
              )}
            </div>

            {/* 全期間チェックインマーク */}
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
                backgroundColor: showAllCheckinMark ? '#e0f2fe' : '#f9fafb',
                borderRadius: '8px',
                border: '2px solid',
                borderColor: showAllCheckinMark ? '#0284c7' : '#e5e7eb',
                transition: 'all 0.2s'
              }}>
                <input
                  type="checkbox"
                  checked={showAllCheckinMark}
                  onChange={(e) => setShowAllCheckinMark(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span>過去にチェックインしたスポットをマーク</span>
              </label>
              {showAllCheckinMark && (
                <div style={{
                  marginTop: '8px', padding: '8px 12px',
                  backgroundColor: '#e0f2fe', borderRadius: '6px',
                  fontSize: '12px', color: '#0369a1'
                }}>
                  ✅ 過去にチェックインしたスポットが青のチェックマークで表示されます
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
              {showTodayCheckinMark && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    backgroundColor: '#16a34a', border: '2px solid white',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                  <span style={{ fontSize: '14px', color: '#374151' }}>当日チェックイン済み</span>
                </div>
              )}
              {showAllCheckinMark && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    backgroundColor: '#0ea5e9', border: '2px solid white',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                  <span style={{ fontSize: '14px', color: '#374151' }}>過去にチェックイン済み</span>
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
      {selectedSpot && (
        <SpotPopup
          spot={selectedSpot}
          distance={userLocation ? calculateDistance(
            userLocation[1],
            userLocation[0],
            selectedSpot.latitude,
            selectedSpot.longitude
          ) : null}
          onClose={() => {
            setSelectedSpot(null);
            // URLパラメータからspotIdを削除
            const params = new URLSearchParams(searchParams);
            params.delete('spotId');
            setSearchParams(params);
            // padding をリセット
            if (map.current) {
              map.current.easeTo({ padding: { top: 0, bottom: 0, left: 0, right: 0 } });
            }
          }}
          onCheckin={handleCheckin}
          onQuiz={handleQuizChallenge}
          onDirections={handleDirections}
          isCheckedIn={checkinStatus === 'cooldown'}
          isCheckedInToday={checkinStatus === 'today'}
          isOnCooldown={isQuizOnCooldown}
          isInRange={userLocation ? calculateDistance(
            userLocation[1],
            userLocation[0],
            selectedSpot.latitude,
            selectedSpot.longitude
          ) <= selectedSpot.detection_radius : false}
        />
      )}

      {showQuiz && quizData && selectedSpot && (
        <QuizModal
          user={user}
          spot={selectedSpot}
          quizData={quizData}
          onClose={handleQuizClose}
          readOnly={quizReadOnly}
          quizTypeId={quizData.quiz_type_id}
          quizTypes={quizTypes}
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
      
      {/* チェックインアニメーション */}
      {showCheckinAnimation && (
        <CheckinAnimation onComplete={() => setShowCheckinAnimation(false)} />
      )}
    </div>
  );
}