import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { storage } from './services/storage';
import { userApi, masterApi, announcementApi } from './services/api';
import { indexedDB } from './services/indexedDB';
import { useScrollRestoration } from './hooks/useScrollRestoration';

// Components
import CreateUser from './components/User/CreateUser';
import Login from './components/User/Login';
import MapView from './components/Map/MapView';
import SpotList from './components/Spot/SpotList';
import SpotDetail from './components/Spot/SpotDetail';
import MyPage from './components/User/MyPage';
import AdminLogin from './components/Admin/AdminLogin';
import AdminSpotList from './components/Admin/AdminSpotList';
import AdminSpotForm from './components/Admin/AdminSpotForm';
import AdminAreaList from './components/Admin/AdminAreaList';
import AdminQuizTypeList from './components/Admin/AdminQuizTypeList';
import AdminQuizTypeForm from './components/Admin/AdminQuizTypeForm';
import AdminAnnouncementList from './components/Admin/AdminAnnouncementList';
import AdminAnnouncementForm from './components/Admin/AdminAnnouncementForm';
import AdminStats from './components/Admin/AdminStats';
import Header from './components/Common/Header';
import Loading from './components/Common/Loading';
import HowToPage from './components/Common/HowToPage';
import AnnouncementModal from './components/Common/AnnouncementModal';
import ToastHost from './components/Common/ToastHost';
import { announcementsToPopup, markAnnouncementsRead, levelOf, LEVEL_STYLES } from './utils/announcement';

import type { User, Spot, Area, QuizType, Announcement } from './types';
import { toast } from './utils/toast';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [quizTypes, setQuizTypes] = useState<QuizType[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  // 公開中のお知らせ（レベルの高い順）と、モーダルで表示中のお知らせ
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [modalAnnouncements, setModalAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    initializeApp();
  }, []);

  // ユーザー情報が変わったら保存し、次の起動ですぐ使えるようにする
  useEffect(() => {
    if (user) storage.setCachedUser(user);
  }, [user]);

  const initializeApp = async () => {
    const userId = storage.getUserId();
    const cachedUser = userId ? storage.getCachedUser(userId) : null;

    // 保存済みのマスタとユーザー情報があれば、通信を待たずに画面を出す
    const hasCachedMaster = await loadCachedMasterData();
    if (cachedUser && hasCachedMaster) {
      setUser(cachedUser);
      setLoading(false);
    }

    // ログイン・マスタの更新確認・お知らせは裏で同時に行う
    // （保存済みのデータがない初回などは、ここが終わるまでローディングを出す）
    await Promise.all([
      userId ? refreshUser(userId) : Promise.resolve(),
      fetchMasterData(),
      fetchAnnouncements(),
    ]);
    setLoading(false);
  };

  const refreshUser = async (userId: string) => {
    try {
      const userData = await userApi.login(userId);
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      // ユーザーが存在しないときだけログアウトする。通信エラーなら保存済みの情報で続ける
      const code = error instanceof Error ? error.message : '';
      if (code === 'USER_NOT_FOUND' || code === 'INVALID_USER_ID') {
        storage.clearUserId();
        setUser(null);
      }
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const announcementData = await announcementApi.getActive();
      setAnnouncements(announcementData.announcements);
      setModalAnnouncements(announcementsToPopup(announcementData.announcements));
    } catch (e) {
      // お知らせ取得失敗はサイレントに無視
    }
  };

  // IndexedDB に保存済みのマスタを読む。スポットかエリアがあれば true
  const loadCachedMasterData = async (): Promise<boolean> => {
    try {
      const [cachedSpots, cachedAreas, cachedQuizTypes] = await Promise.all([
        indexedDB.getAllSpots(),
        indexedDB.getAllAreas(),
        indexedDB.getAllQuizTypes(),
      ]);
      setSpots(cachedSpots);
      setAreas(cachedAreas);
      setQuizTypes(cachedQuizTypes);
      return cachedSpots.length > 0 || cachedAreas.length > 0;
    } catch (error) {
      console.error('Failed to load cached master data:', error);
      return false;
    }
  };

  // サーバーのバージョンと比べ、変わっていれば取り直して IndexedDB と画面を更新する
  const fetchMasterData = async () => {
    try {
      const localVersion = storage.getMasterVersion();
      const versionData = await masterApi.getVersion();

      if (!localVersion || localVersion !== versionData.version) {
        const masterData = await masterApi.getMasterData(localVersion || undefined);

        if (masterData.spots.length > 0 || masterData.areas.length > 0) {
          await indexedDB.saveSpots(masterData.spots);
          await indexedDB.saveAreas(masterData.areas);
          if (masterData.quiz_types.length > 0) {
            await indexedDB.saveQuizTypes(masterData.quiz_types);
          }
          storage.setMasterVersion(masterData.version);
          await loadCachedMasterData();
        }
      }
    } catch (error) {
      // 取れなければ保存済みのマスタのまま使う
      console.error('Failed to fetch master data:', error);
    }
  };

  const handleReload = async () => {
    if (reloading) return;
    
    setReloading(true);
    try {
      // 強制的にサーバーから最新データを取得
      storage.setMasterVersion(''); // バージョンをクリア
      await fetchMasterData();
      
      // ユーザー情報も更新
      if (user) {
        const userData = await userApi.login(user.user_id);
        setUser(userData);
      }
      
      toast.success('データを更新しました');
    } catch (error) {
      console.error('Reload error:', error);
      toast.error('更新に失敗しました');
    } finally {
      setReloading(false);
    }
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    storage.setUserId(userData.user_id);
  };

  const handleLogout = () => {
    setUser(null);
    storage.clearUserId();
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <BrowserRouter>
      <AppContent
        user={user}
        setUser={setUser}
        spots={spots}
        areas={areas}
        quizTypes={quizTypes}
        loading={loading}
        reloading={reloading}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
        handleReload={handleReload}
        announcements={announcements}
        onShowAnnouncements={setModalAnnouncements}
      />
      {modalAnnouncements.length > 0 && (
        <AnnouncementModal
          announcements={modalAnnouncements}
          onClose={() => {
            markAnnouncementsRead(modalAnnouncements, announcements);
            setModalAnnouncements([]);
          }}
        />
      )}
      <ToastHost />
    </BrowserRouter>
  );
}

function AppContent({
  user,
  setUser,
  spots,
  areas,
  quizTypes,
  loading,
  reloading,
  handleLogin,
  handleLogout,
  handleReload,
  announcements,
  onShowAnnouncements
}: {
  user: User | null;
  setUser: (user: User) => void;
  spots: Spot[];
  areas: Area[];
  quizTypes: QuizType[];
  loading: boolean;
  reloading: boolean;
  handleLogin: (userData: User) => void;
  handleLogout: () => void;
  handleReload: () => void;
  announcements: Announcement[];
  onShowAnnouncements: (announcements: Announcement[]) => void;
}) {
  const location = useLocation();
  const isMapPage = location.pathname === '/';
  // 使い方ページは自前の sticky バーを持つので、アプリのヘッダーは出さない（2つ重なるため）
  const showHeader = user && location.pathname !== '/howto';
  const urgentAnnouncements = announcements.filter(a => levelOf(a) === 'urgent');
  useScrollRestoration();

  return (
    <div className={`app ${isMapPage ? 'map-page' : ''}`}>
        {showHeader && (
          <Header user={user} onLogout={handleLogout} />
        )}
        
        {/* 地図以外はページ全体（body）でスクロールする。中に別のスクロール領域を作ると、iOS でヘッダーごと動いてずれる */}
        <div style={isMapPage ? {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative'
        } : {
          flex: 1,
          overflowX: 'clip'
        }}>
          {/* 緊急のお知らせは、地図画面の上部に帯でも出す */}
          {user && isMapPage && urgentAnnouncements.length > 0 && (
            <button
              onClick={() => onShowAnnouncements(urgentAnnouncements)}
              style={{
                position: 'absolute',
                top: '12px',
                left: '56px',
                right: '56px',
                zIndex: 1000,
                padding: '10px 14px',
                backgroundColor: LEVEL_STYLES.urgent.color,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                textAlign: 'left',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <WarningAmberIcon style={{ fontSize: '18px', verticalAlign: '-4px', marginRight: '6px' }} aria-hidden="true" />
              {urgentAnnouncements[0].title}
              {urgentAnnouncements.length > 1 && ` ほか ${urgentAnnouncements.length - 1} 件`}
            </button>
          )}

          <Routes>
          {/* ユーザー未ログイン時 */}
          {!user ? (
            <>
              <Route path="/create" element={<CreateUser onLogin={handleLogin} />} />
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <>
              {/* メイン画面 */}
              <Route path="/" element={<MapView user={user} spots={spots} areas={areas} quizTypes={quizTypes} />} />
              <Route path="/spots" element={<SpotList spots={spots} user={user} areas={areas} quizTypes={quizTypes} />} />
              <Route path="/spots/:spotId" element={<SpotDetail user={user} quizTypes={quizTypes} areas={areas} />} />
              <Route path="/mypage" element={<MyPage user={user} setUser={setUser} spots={spots} areas={areas} quizTypes={quizTypes} announcements={announcements} onShowAnnouncements={onShowAnnouncements} onReload={handleReload} reloading={reloading} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}

          {/* 使い方ページ（ログイン不要） */}
          <Route path="/howto" element={<HowToPage />} />

          {/* 管理画面 */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/areas" element={<AdminAreaList />} />
          <Route path="/admin/quiz-types" element={<AdminQuizTypeList />} />
          <Route path="/admin/quiz-types/new" element={<AdminQuizTypeForm />} />
          <Route path="/admin/quiz-types/:quizTypeId/edit" element={<AdminQuizTypeForm />} />
          <Route path="/admin/spots" element={<AdminSpotList />} />
          <Route path="/admin/spots/new" element={<AdminSpotForm />} />
          <Route path="/admin/spots/:spotId/edit" element={<AdminSpotForm />} />
          <Route path="/admin/announcements" element={<AdminAnnouncementList />} />
          <Route path="/admin/announcements/new" element={<AdminAnnouncementForm />} />
          <Route path="/admin/announcements/:announcementId/edit" element={<AdminAnnouncementForm />} />
          <Route path="/admin/stats" element={<AdminStats />} />
        </Routes>
        </div>
      </div>
  );
}

export default App;