import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { storage } from './services/storage';
import { userApi, masterApi } from './services/api';
import { indexedDB } from './services/indexedDB';
import RefreshIcon from '@mui/icons-material/Refresh';

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
import Header from './components/Common/Header';
import Loading from './components/Common/Loading';
import HowToPage from './components/Common/HowToPage';

import type { User, Spot, Area } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // ユーザーIDをチェック
      const userId = storage.getUserId();

      if (userId) {
        // ログイン
        const userData = await userApi.login(userId);
        setUser(userData);
      }

      // マスタデータを取得
      await fetchMasterData();
    } catch (error) {
      console.error('Initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      // ローカルバージョンを確認
      const localVersion = storage.getMasterVersion();

      // サーバーから最新バージョンを取得
      const versionData = await masterApi.getVersion();

      // バージョンが異なる場合、または初回起動の場合
      if (!localVersion || localVersion !== versionData.version) {
        const masterData = await masterApi.getMasterData(localVersion || undefined);

        if (masterData.spots.length > 0 || masterData.areas.length > 0) {
          // IndexedDBに保存
          await indexedDB.saveSpots(masterData.spots);
          await indexedDB.saveAreas(masterData.areas);
          storage.setMasterVersion(masterData.version);
        }
      }

      // IndexedDBからデータを読み込み
      const cachedSpots = await indexedDB.getAllSpots();
      const cachedAreas = await indexedDB.getAllAreas();
      setSpots(cachedSpots);
      setAreas(cachedAreas);
    } catch (error) {
      console.error('Failed to fetch master data:', error);
      // キャッシュから読み込み
      const cachedSpots = await indexedDB.getAllSpots();
      const cachedAreas = await indexedDB.getAllAreas();
      setSpots(cachedSpots);
      setAreas(cachedAreas);
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
      
      alert('データを更新しました');
    } catch (error) {
      console.error('Reload error:', error);
      alert('更新に失敗しました');
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
        loading={loading}
        reloading={reloading}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
        handleReload={handleReload}
      />
    </BrowserRouter>
  );
}

function AppContent({
  user,
  setUser,
  spots,
  areas,
  loading,
  reloading,
  handleLogin,
  handleLogout,
  handleReload
}: {
  user: User | null;
  setUser: (user: User) => void;
  spots: Spot[];
  areas: Area[];
  loading: boolean;
  reloading: boolean;
  handleLogin: (userData: User) => void;
  handleLogout: () => void;
  handleReload: () => void;
}) {
  const location = useLocation();
  const isMapPage = location.pathname === '/';

  return (
    <div className={`app ${isMapPage ? 'map-page' : ''}`}>
        {user && (
          <Header user={user} onLogout={handleLogout} />
        )}
        
        <div style={isMapPage ? {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative'
        } : {
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {user && (
            /* 再読み込みボタン */
            <button
              onClick={handleReload}
              disabled={reloading}
              style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                padding: '12px 16px',
                backgroundColor: reloading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: reloading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 999,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!reloading) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
            >
              <RefreshIcon style={{ fontSize: '18px', marginRight: '4px' }} />
              {reloading ? '更新中...' : '再読み込み'}
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
              <Route path="/" element={<MapView user={user} spots={spots} areas={areas} />} />
              <Route path="/spots" element={<SpotList spots={spots} user={user} areas={areas} />} />
              <Route path="/spots/:spotId" element={<SpotDetail user={user} />} />
              <Route path="/mypage" element={<MyPage user={user} setUser={setUser} spots={spots} areas={areas} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}

          {/* 使い方ページ（ログイン不要） */}
          <Route path="/howto" element={<HowToPage />} />

          {/* 管理画面 */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/areas" element={<AdminAreaList />} />
          <Route path="/admin/spots" element={<AdminSpotList />} />
          <Route path="/admin/spots/new" element={<AdminSpotForm />} />
          <Route path="/admin/spots/:spotId/edit" element={<AdminSpotForm />} />
        </Routes>
        </div>
      </div>
  );
}

export default App;