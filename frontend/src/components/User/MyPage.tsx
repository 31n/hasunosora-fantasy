import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../../services/storage';
import { userApi } from '../../services/api';
import type { User, CheckInHistory, Spot, Area, QuizType } from '../../types';

interface MyPageProps {
  user: User;
  setUser: (user: User) => void;
  spots: Spot[];
  areas: Area[];
  quizTypes: QuizType[];
}

// JST日付文字列（YYYY-MM-DD）を返す純粋関数
const toJstDate = (utcStr: string): string => {
  const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(utcStr) ? utcStr : utcStr + 'Z';
  return new Date(new Date(normalized).getTime() + 9 * 3600000).toISOString().slice(0, 10);
};

// Google Polyline encoding（Mapbox Static API路線オーバーレイ用）
const encodePolyline = (coords: [number, number][]): string => {
  const enc = (v: number): string => {
    let n = v < 0 ? ~(v << 1) : (v << 1);
    let s = '';
    while (n >= 0x20) { s += String.fromCharCode((0x20 | (n & 0x1f)) + 63); n >>= 5; }
    return s + String.fromCharCode(n + 63);
  };
  let pLat = 0, pLng = 0;
  return coords.map(([lng, lat]) => {
    const dLat = Math.round((lat - pLat) * 1e5);
    const dLng = Math.round((lng - pLng) * 1e5);
    const r = enc(dLat) + enc(dLng);
    pLat = lat; pLng = lng;
    return r;
  }).join('');
};

// 日付ごとの色パレット（Mapbox pin/path color: 6桁HEX, # なし）
const DATE_COLORS = [
  'F8B500', '5383C3', '68BE8D', 'BA2636',
  'E7609E', 'C8C2C6', 'A2D7DD', 'FAD764',
  '9D8DE2', 'F56455', '1EBECD'
] as const;

// 凡例用短縮日付（例: "7/1(月)"）
const formatLegendDate = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, d).getDay()];
  return `${m}/${d}(${dow})`;
};

export default function MyPage({ user, setUser, spots, areas, quizTypes }: MyPageProps) {
  const [nickname, setNickname] = useState('');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [history, setHistory] = useState<CheckInHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUserId, setShowUserId] = useState(false);
  const [selectedStatArea, setSelectedStatArea] = useState<string>('all'); // 統計表示用エリア
  const [showAreaCodeInput, setShowAreaCodeInput] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);
  // マップ画像生成用
  const [mapDateFrom, setMapDateFrom] = useState(() =>
    new Date(Date.now() + 9 * 3600000 - 6 * 24 * 3600000).toISOString().slice(0, 10)
  );
  const [mapDateTo, setMapDateTo] = useState(() =>
    new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10)
  );
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    const activeTypes = quizTypes.filter(qt => qt.is_active);
    if (activeTypes.length > 0 && !user.selected_quiz_type) {
      const lowestPriority = [...activeTypes].sort((a, b) => b.display_order - a.display_order)[0];
      handleQuizTypeChange(lowestPriority.quiz_type_id);
    }
  }, [quizTypes]);

  const loadHistory = async () => {
    try {
      const data = await userApi.getHistory(user.user_id);
      setHistory(data.checkins);
    } catch (error) {
      console.error('履歴取得エラー:', error);
    }
  };

  const handleSetNickname = async () => {
    if (!nickname.trim()) {
      alert('ニックネームを入力してください');
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await userApi.setNickname(user.user_id, nickname.trim());
      setUser(updatedUser);
      setIsEditingNickname(false);
      alert('ニックネームを設定しました');
    } catch (error: any) {
      if (error.message.includes('NICKNAME_ALREADY_SET')) {
        alert('ニックネームは既に設定済みです');
      } else {
        alert('ニックネームの設定に失敗しました。しばらく時間をおいてから再試行してください。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      storage.clearUserId();
      navigate('/login');
      window.location.reload();
    }
  };

  const handleUnlockGenre = async () => {
    if (!genreCode.trim()) {
      alert('ジャンルコードを入力してください');
      return;
    }

    setLoading(true);
    try {
      const result = await userApi.unlockGenre(user.user_id, genreCode.trim());
      setUser(result.user);
      setGenreCode('');
      setShowGenreCodeInput(false);
      alert(`「${result.unlocked_genre}」ジャンルが解放されました！`);
    } catch (error: any) {
      if (error.message.includes('INVALID_GENRE_CODE')) {
        alert('無効なジャンルコードです');
      } else if (error.message.includes('GENRE_ALREADY_UNLOCKED')) {
        alert('このジャンルは既に解放済みです');
      } else {
        alert('エラーが発生しました。しばらく時間をおいてから再試行してください。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuizTypeChange = async (quizTypeId: string) => {
    setLoading(true);
    try {
      const updatedUser = await userApi.setSelectedQuizType(user.user_id, quizTypeId || null);
      setUser(updatedUser);
    } catch (error: any) {
      alert('クイズタイプの変更に失敗しました。しばらく時間をおいてから再試行してください。');
    } finally {
      setLoading(false);
    }
  };

  const handleAreaChange = async (areaId: string, checked: boolean) => {
    setLoading(true);
    try {
      const current = user.selected_areas || [];
      const updated = checked
        ? [...current, areaId]
        : current.filter(id => id !== areaId);
      const updatedUser = await userApi.setSelectedAreas(user.user_id, updated);
      setUser(updatedUser);
    } catch (error: any) {
      alert('エリアの変更に失敗しました。しばらく時間をおいてから再試行してください。');
    } finally {
      setLoading(false);
    }
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(user.user_id);
    alert('ユーザーIDをコピーしました');
  };

  const handleUnlockArea = async () => {
    if (!areaCode.trim()) {
      alert('エリアコードを入力してください');
      return;
    }

    setLoading(true);
    try {
      const result = await userApi.unlockArea(user.user_id, areaCode.trim());
      setUser(result.user);
      setAreaCode('');
      setShowAreaCodeInput(false);
      alert(`${result.unlocked_area} エリアが解放されました！`);
    } catch (error: any) {
      if (error.message.includes('INVALID_AREA_CODE')) {
        alert('無効なエリアコードです');
      } else if (error.message.includes('AREA_ALREADY_UNLOCKED')) {
        alert('このエリアはすでに解放済みです');
      } else {
        alert('エラーが発生しました。しばらく時間をおいてから再試行してください。');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    // タイムゾーン情報がない文字列はUTCとして扱う（バックエンドはUTC保存）
    const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(dateString) ? dateString : dateString + 'Z';
    const date = new Date(normalized);
    const parts = new Intl.DateTimeFormat('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Tokyo'
    }).formatToParts(date);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    return `${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`;
  };

  // エリア別統計計算
  const stats = useMemo(() => {
    const filteredHistory = selectedStatArea === 'all' 
      ? history 
      : history.filter(h => {
          const spot = spots.find(s => s.spot_id === h.spot_id);
          return spot?.area === selectedStatArea;
        });

    return {
      totalVisits: filteredHistory.length,
      uniqueSpots: new Set(filteredHistory.map(h => h.spot_id)).size,
      correctAnswers: filteredHistory.filter(h => h.quiz_correct).length,
      totalScore: filteredHistory.reduce((sum, h) => sum + h.score_earned, 0)
    };
  }, [history, spots, selectedStatArea]);

  // マップ画像生成用フィルター集計（リアルタイムプレビュー）
  const mapFilteredCount = useMemo(() => {
    if (!mapDateFrom || !mapDateTo) return { visits: 0, spots: 0 };
    const filtered = history.filter(h => {
      const d = toJstDate(h.checked_in_at);
      return d >= mapDateFrom && d <= mapDateTo;
    });
    return {
      visits: filtered.length,
      spots: new Set(filtered.map(h => h.spot_id)).size
    };
  }, [history, mapDateFrom, mapDateTo]);

  const generateAndShareMap = async () => {
    if (!mapDateFrom || !mapDateTo) { alert('日付を指定してください'); return; }
    if (mapDateFrom > mapDateTo) { alert('開始日は終了日以前にしてください'); return; }

    const filtered = [...history]
      .filter(h => { const d = toJstDate(h.checked_in_at); return d >= mapDateFrom && d <= mapDateTo; })
      .sort((a, b) => new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime());

    if (filtered.length === 0) { alert('指定した期間の訪問履歴がありません'); return; }

    const getCoords = (spotId: string): [number, number] | null => {
      const s = spots.find(sp => sp.spot_id === spotId);
      return s ? [s.longitude, s.latitude] : null;
    };

    // 日付ごとに色を割り当て
    const uniqueDates = [...new Set(filtered.map(h => toJstDate(h.checked_in_at)))].sort();
    const dateColorMap = new Map(
      uniqueDates.map((d, i) => [d, DATE_COLORS[i % DATE_COLORS.length]])
    );

    // ユニークスポット（初訪問時系列順）
    const seenSpots = new Set<string>();
    const uniqueVisits = filtered.filter(h => {
      if (seenSpots.has(h.spot_id)) return false;
      seenSpots.add(h.spot_id);
      return true;
    });

    const env = (import.meta as unknown as { env: { VITE_MAPBOX_TOKEN: string; VITE_MAPBOX_STATIC_STYLE?: string } }).env;
    const token = env.VITE_MAPBOX_TOKEN;
    // VITE_MAPBOX_STATIC_STYLE に日本語Mapbox Studioスタイルを指定すると地図が日本語表示になる
    const mapStyle = env.VITE_MAPBOX_STATIC_STYLE ?? 'mapbox/streets-v12';
    const overlayParts: string[] = [];

    // 日付ごとのルートライン（paths を pins より先に追加して下層描画）
    uniqueDates.forEach(date => {
      const dayCoords: [number, number][] = filtered
        .filter(h => toJstDate(h.checked_in_at) === date)
        .map(h => getCoords(h.spot_id))
        .filter((c): c is [number, number] => c !== null);
      if (dayCoords.length >= 2) {
        const color = dateColorMap.get(date)!;
        overlayParts.push(`path-4+${color}-0.85(${encodeURIComponent(encodePolyline(dayCoords))})`);
      }
    });

    // 日付色対応のピン（80オブジェクト上限に合わせた最大数）
    const maxPins = Math.max(1, 79 - overlayParts.length);
    let pinCount = 0;
    for (const h of uniqueVisits) {
      if (pinCount >= maxPins) break;
      const c = getCoords(h.spot_id);
      if (!c) continue;
      overlayParts.push(`pin-s+${dateColorMap.get(toJstDate(h.checked_in_at))!}(${c[0]},${c[1]})`);
      pinCount++;
    }

    if (overlayParts.length === 0) { alert('地図に表示できるスポットがありません'); return; }

    const staticUrl = `https://api.mapbox.com/styles/v1/${mapStyle}/static/${overlayParts.join(',')}/auto/1200x630?padding=60&access_token=${token}`;

    setIsGeneratingMap(true);
    try {
      const mapRes = await fetch(staticUrl);
      if (!mapRes.ok) throw new Error(`Mapbox API error: ${mapRes.status}`);
      const mapBlob = await mapRes.blob();

      // フッター高さを日付数から計算
      const SIDE_PAD = 20;
      const ITEM_W = 130;
      const ITEMS_PER_ROW = Math.max(1, Math.floor((1200 - SIDE_PAD * 2) / ITEM_W));
      const legendRows = Math.ceil(uniqueDates.length / ITEMS_PER_ROW);
      const FOOTER_H = 14 + 26 + 8 + legendRows * 26 + 14;

      // Canvas 生成
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630 + FOOTER_H;
      const ctx = canvas.getContext('2d')!;

      // 地図画像を描画
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        const objUrl = URL.createObjectURL(mapBlob);
        img.onload = () => { ctx.drawImage(img, 0, 0, 1200, 630); URL.revokeObjectURL(objUrl); resolve(); };
        img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error('地図画像の読み込みに失敗')); };
        img.src = objUrl;
      });

      // フッター背景
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 630, 1200, FOOTER_H);
      // セパレーター
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 630.5); ctx.lineTo(1200, 630.5); ctx.stroke();

      const font = '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif';
      const TITLE_Y = 630 + 14 + 18;

      // タイトル（日付範囲）
      const fmt = (s: string) => `${parseInt(s.slice(5, 7))}/${parseInt(s.slice(8, 10))}`;
      const sameYear = mapDateFrom.slice(0, 4) === mapDateTo.slice(0, 4);
      const titleStr = sameYear
        ? (mapDateFrom === mapDateTo
            ? `${mapDateFrom.slice(0, 4)}/${fmt(mapDateFrom)} の巡礼マップ`
            : `${mapDateFrom.slice(0, 4)}/${fmt(mapDateFrom)}〜${fmt(mapDateTo)} の巡礼マップ`)
        : `${mapDateFrom}〜${mapDateTo} の巡礼マップ`;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `bold 18px ${font}`;
      ctx.fillText(titleStr, SIDE_PAD, TITLE_Y);

      // スポット数（右寄せ）
      const spotLabel = `${uniqueVisits.length} スポット`;
      ctx.font = `13px ${font}`;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(spotLabel, 1200 - SIDE_PAD - ctx.measureText(spotLabel).width, TITLE_Y);

      // 日付凡例
      let lx = SIDE_PAD;
      let ly = 630 + 14 + 26 + 8 + 13;
      uniqueDates.forEach((date, i) => {
        const color = `#${dateColorMap.get(date)!}`;
        // カラードット
        ctx.beginPath();
        ctx.arc(lx + 7, ly, 7, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        // 日付ラベル
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = `bold 13px ${font}`;
        ctx.fillText(formatLegendDate(date), lx + 18, ly + 5);

        lx += ITEM_W;
        if ((i + 1) % ITEMS_PER_ROW === 0) { lx = SIDE_PAD; ly += 26; }
      });

      // PNG として書き出し
      const finalBlob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png')
      );

      const fileName = `hasunosora-map-${mapDateFrom}-to-${mapDateTo}.png`;
      const file = new File([finalBlob], fileName, { type: 'image/png' });
      const shareText = `${mapDateFrom}〜${mapDateTo}の巡礼記録（${uniqueVisits.length}スポット）`;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: '巡礼マップ', text: shareText });
      } else {
        const url = URL.createObjectURL(finalBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('マップ生成エラー:', err);
      alert('地図画像の生成に失敗しました。しばらく時間をおいて再試行してください。');
    } finally {
      setIsGeneratingMap(false);
    }
  };

  return (
    <div style={{ 
      width: '100%',
      maxWidth: '1000px',
      padding: '16px',
      margin: '0 auto',
      boxSizing: 'border-box'
    }}>
      <h1 style={{ marginBottom: '24px' }}>マイページ</h1>

      {/* ユーザー情報 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px' }}>プロフィール</h2>
            {!user.nickname && !isEditingNickname && (
              <button
                onClick={() => setIsEditingNickname(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                設定
              </button>
            )}
          </div>

          {user.nickname ? (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                ニックネーム
              </p>
              <p style={{ fontSize: '20px', fontWeight: '600' }}>
                {user.nickname}
              </p>
            </div>
          ) : isEditingNickname ? (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '8px'
              }}>
                ニックネーム（変更不可）
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="ニックネームを入力"
                  maxLength={20}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
                <button
                  onClick={handleSetNickname}
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              ニックネームが未設定です
            </p>
          )}

          <div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              ユーザーID
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <code style={{
                padding: '8px 12px',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '16px',
                letterSpacing: '2px'
              }}>
                {showUserId ? user.user_id : '•••••••••'}
              </code>
              <button
                onClick={() => setShowUserId(!showUserId)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#e5e7eb',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {showUserId ? '隠す' : '表示'}
              </button>
              <button
                onClick={copyUserId}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#e5e7eb',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                📋 コピー
              </button>
            </div>
          </div>

          {/* エリア選択 */}
          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              表示エリア（複数選択可）
            </p>
            <div style={{
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px',
              backgroundColor: 'white',
              opacity: loading ? 0.5 : 1
            }}>
              {areas.filter(a => {
                if (!a.is_active) return false;
                if (a.is_restricted) {
                  return user.unlocked_areas?.includes(a.area_id);
                }
                return true;
              }).map(area => {
                const isCampaign = area.area_type === 'campaign';
                const today = new Date().toISOString().slice(0, 10);
                const isExpired = isCampaign && area.end_date ? area.end_date < today : false;
                const notStarted = isCampaign && area.start_date ? area.start_date > today : false;
                return (
                  <label key={area.area_id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    padding: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    borderRadius: '6px',
                    backgroundColor: isCampaign ? '#fffbeb' : undefined,
                    border: isCampaign ? '1px solid #fde68a' : undefined
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={(user.selected_areas || []).includes(area.area_id)}
                        onChange={(e) => handleAreaChange(area.area_id, e.target.checked)}
                        disabled={loading}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '16px' }}>{area.area_name}</span>
                      {isCampaign && (
                        <span style={{
                          padding: '1px 7px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: isExpired ? '#e5e7eb' : '#fef3c7',
                          color: isExpired ? '#6b7280' : '#92400e',
                          whiteSpace: 'nowrap'
                        }}>
                          {isExpired ? '終了' : notStarted ? '公開前' : '開催中'}
                        </span>
                      )}
                    </div>
                    {isCampaign && (
                      <div style={{ paddingLeft: '24px', fontSize: '12px', color: '#6b7280', lineHeight: '1.6' }}>
                        {area.description && (
                          <div>{area.description}</div>
                        )}
                        {(area.start_date || area.end_date) && (
                          <div>
                            期間: {area.start_date ?? '未定'} 〜 {area.end_date ?? '未定'}
                          </div>
                        )}
                        {area.external_url && (
                          <a
                            href={area.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#3b82f6', textDecoration: 'underline' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            公式ページを見る →
                          </a>
                        )}
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
              選択したエリアのスポットのみが地図に表示されます（未選択時は全エリア表示）
            </p>
          </div>

          {/* クイズタイプ選択 */}
          {quizTypes.filter(qt => qt.is_active).length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                クイズタイプ
              </p>
              <select
                value={user.selected_quiz_type || ''}
                onChange={(e) => handleQuizTypeChange(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1
                }}
              >
                {quizTypes
                  .filter(qt => qt.is_active)
                  .sort((a, b) => a.display_order - b.display_order)
                  .map(qt => (
                    <option key={qt.quiz_type_id} value={qt.quiz_type_id}>
                      {qt.name}
                    </option>
                  ))}
              </select>
              {(() => {
                const selectedType = quizTypes.find(qt => qt.quiz_type_id === user.selected_quiz_type);
                return selectedType?.description ? (
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px', lineHeight: '1.5' }}>
                    {selectedType.description}
                  </p>
                ) : (
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    スポット訪問時に出題されるクイズのタイプを選択できます
                  </p>
                );
              })()}
            </div>
          )}

          {/* エリアコード入力 */}
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                隠しエリアの解放
              </h3>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                エリアコードを入力して隠しエリアを解放
              </p>
              {!showAreaCodeInput && (
                <button
                  onClick={() => setShowAreaCodeInput(true)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🔓 コード入力
                </button>
              )}
            </div>

            {user.unlocked_areas && user.unlocked_areas.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                  解放済みエリア
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {user.unlocked_areas.map((areaId) => {
                    const area = areas.find(a => a.area_id === areaId);
                    return (
                      <span key={areaId} style={{
                        padding: '6px 12px',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        {area?.area_name || areaId}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {showAreaCodeInput && (
              <div style={{
                padding: '16px',
                backgroundColor: '#fef3c7',
                borderRadius: '12px',
                marginTop: '12px'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#92400e'
                }}>
                  エリアコードを入力
                </label>
                <input
                  type="text"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  placeholder="コードを入力"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px solid #fbbf24',
                    borderRadius: '8px',
                    fontSize: '16px',
                    marginBottom: '12px',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={handleUnlockArea}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.5 : 1
                    }}
                  >
                    {loading ? '解放中...' : '✨ 解放する'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAreaCodeInput(false);
                      setAreaCode('');
                    }}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ログアウトボタン */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '16px'
          }}
        >
          ログアウト
        </button>
      </div>

      {/* 統計情報 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px' }}>統計</h2>
          <select
            value={selectedStatArea}
            onChange={(e) => setSelectedStatArea(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '2px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="all">全エリア</option>
            {areas.filter(a => a.is_active).map(area => (
              <option key={area.area_id} value={area.area_id}>
                {area.area_name}
              </option>
            ))}
          </select>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px'
        }}>
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px' }}>
              {stats.totalScore}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>合計得点</p>
          </div>
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}>
              {stats.uniqueSpots}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>訪問スポット数</p>
          </div>
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '4px' }}>
              {stats.totalVisits}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>総訪問回数</p>
          </div>
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '4px' }}>
              {stats.correctAnswers}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>正解数</p>
          </div>
        </div>
      </div>

      {/* 訪問履歴 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>最近の訪問</h2>

        {/* 訪問マップ生成 */}
        <div style={{
          padding: '16px',
          backgroundColor: '#f0f9ff',
          borderRadius: '10px',
          marginBottom: '16px',
          border: '1px solid #bae6fd'
        }}>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1', marginBottom: '10px' }}>
            🗺️ 訪問マップを生成
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
            <input
              type="date"
              value={mapDateFrom}
              max={mapDateTo}
              onChange={(e) => setMapDateFrom(e.target.value)}
              style={{
                padding: '8px',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            />
            <span style={{ color: '#6b7280', fontSize: '14px' }}>〜</span>
            <input
              type="date"
              value={mapDateTo}
              min={mapDateFrom}
              onChange={(e) => setMapDateTo(e.target.value)}
              style={{
                padding: '8px',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            />
          </div>
          {mapFilteredCount.visits > 0 ? (
            <p style={{ fontSize: '12px', color: '#0369a1', marginBottom: '10px' }}>
              {mapFilteredCount.visits}件の訪問 / {mapFilteredCount.spots}スポット
              {mapFilteredCount.spots > 79 && (
                <span style={{ color: '#d97706', marginLeft: '6px' }}>（ピンは上位79スポットのみ表示）</span>
              )}
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>
              この期間の訪問はありません
            </p>
          )}
          <button
            onClick={generateAndShareMap}
            disabled={isGeneratingMap || mapFilteredCount.visits === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: isGeneratingMap || mapFilteredCount.visits === 0 ? '#93c5fd' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isGeneratingMap || mapFilteredCount.visits === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {isGeneratingMap ? '生成中...' : '📸 マップ画像を保存 / シェア'}
          </button>
        </div>

        {history.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '24px 0' }}>
            まだ訪問履歴がありません
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[...history].sort((a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime()).slice(0, showAllHistory ? undefined : 10).map((item, index) => (
              <div
                key={index}
                onClick={() => navigate(`/spots/${item.spot_id}`, { state: { from: '/mypage' } })}
                style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontWeight: '600' }}>{item.spot_name}</p>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    {formatDate(item.checked_in_at)}
                  </p>
                </div>
                {item.quiz_answered && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      backgroundColor: item.quiz_correct ? '#d1fae5' : '#fee2e2',
                      color: item.quiz_correct ? '#065f46' : '#991b1b',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {item.quiz_correct ? '正解' : '不正解'}
                    </span>
                    {item.quiz_correct && (
                      <span style={{ fontSize: '14px', color: '#059669', fontWeight: '600' }}>
                        +{item.score_earned}点
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {history.length > 10 && (
          <button
            onClick={() => setShowAllHistory(!showAllHistory)}
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '12px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {showAllHistory ? '折りたたむ' : `すべて表示（${history.length}件）`}
          </button>
        )}
      </div>
    </div>
  );
}