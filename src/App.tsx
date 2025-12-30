import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { storage } from './services/storage';
import { userApi, masterApi } from './services/api';
import { indexedDB } from './services/indexedDB';

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
import Header from './components/Common/Header';
import Loading from './components/Common/Loading';

import type { User, Spot } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

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
        const spotsData = await masterApi.getSpots(localVersion || undefined);

        if (spotsData.spots.length > 0) {
          // IndexedDBに保存
          await indexedDB.saveSpots(spotsData.spots);
          storage.setMasterVersion(spotsData.version);
        }
      }

      // IndexedDBからスポットを読み込み
      const cachedSpots = await indexedDB.getAllSpots();
      setSpots(cachedSpots);
    } catch (error) {
      console.error('Failed to fetch master data:', error);
      // キャッシュから読み込み
      const cachedSpots = await indexedDB.getAllSpots();
      setSpots(cachedSpots);
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
      <div className="app">
        {user && <Header user={user} onLogout={handleLogout} />}
        
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
              <Route path="/" element={<MapView user={user} spots={spots} />} />
              <Route path="/spots" element={<SpotList spots={spots} />} />
              <Route path="/spots/:spotId" element={<SpotDetail user={user} />} />
              <Route path="/mypage" element={<MyPage user={user} setUser={setUser} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}

          {/* 管理画面 */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/spots" element={<AdminSpotList />} />
          <Route path="/admin/spots/new" element={<AdminSpotForm />} />
          <Route path="/admin/spots/:spotId/edit" element={<AdminSpotForm />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
