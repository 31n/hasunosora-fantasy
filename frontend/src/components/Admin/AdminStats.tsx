import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { storage } from '../../services/storage';

type DailyEntry = { date: string; count: number };
type CheckinSpot = { spot_id: string; spot_name: string; count: number };
type QuizRateSpot = { spot_id: string; spot_name: string; answered: number; correct: number; rate: number };

type Stats = {
  total_users: number;
  active_users_7d: number;
  daily_new_users: DailyEntry[];
  daily_active_users: DailyEntry[];
  top_checkin_spots: CheckinSpot[];
  top_quiz_correct_spots: QuizRateSpot[];
  low_quiz_correct_spots: QuizRateSpot[];
};

function BarChart({ data, color, label }: { data: DailyEntry[]; color: string; label: string }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const CHART_HEIGHT = 160;

  // 7日ごとにラベルを表示
  const showLabel = (_: DailyEntry, i: number) => i === 0 || i % 7 === 0 || i === data.length - 1;

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>{label}</h3>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: `${CHART_HEIGHT}px`, position: 'relative' }}>
        {data.map((d, i) => {
          const barH = max === 0 ? 0 : Math.max(Math.round((d.count / max) * (CHART_HEIGHT - 20)), d.count > 0 ? 2 : 0);
          return (
            <div
              key={d.date}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', position: 'relative' }}
              title={`${d.date}: ${d.count}人`}
            >
              {d.count > 0 && (
                <span style={{
                  fontSize: '9px',
                  color: '#6b7280',
                  marginBottom: '2px',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}>
                  {d.count}
                </span>
              )}
              <div
                style={{
                  width: '100%',
                  height: `${barH}px`,
                  backgroundColor: color,
                  borderRadius: '2px 2px 0 0',
                  minHeight: d.count > 0 ? '2px' : '0',
                  transition: 'height 0.3s ease',
                }}
              />
              {showLabel(d, i) && (
                <span style={{
                  fontSize: '9px',
                  color: '#9ca3af',
                  marginTop: '3px',
                  transform: 'rotate(-45deg)',
                  transformOrigin: 'top left',
                  whiteSpace: 'nowrap',
                  position: 'absolute',
                  bottom: '-20px',
                  left: '50%',
                }}>
                  {d.date.slice(5)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ height: '28px' }} />
    </div>
  );
}

export default function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const password = storage.getAdminPassword();
    if (!password) {
      navigate('/admin');
      return;
    }
    load(password);
  }, [navigate]);

  const load = async (password: string) => {
    try {
      const data = await adminApi.getStats(password);
      setStats(data);
    } catch (e: any) {
      setError('統計の取得に失敗しました: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '900px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/admin/spots')}
        style={{
          marginBottom: '16px',
          padding: '8px 16px',
          backgroundColor: 'transparent',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        ← スポット管理へ
      </button>

      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>ユーザー統計</h1>

      {loading && <p>読み込み中...</p>}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      {stats && (
        <>
          {/* サマリーカード */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <div style={{
              flex: '1 1 180px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              padding: '20px 24px',
            }}>
              <p style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 600, marginBottom: '4px' }}>総ユーザー数</p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#1d4ed8' }}>{stats.total_users.toLocaleString()}</p>
              <p style={{ fontSize: '12px', color: '#93c5fd', marginTop: '4px' }}>全期間</p>
            </div>
            <div style={{
              flex: '1 1 180px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '20px 24px',
            }}>
              <p style={{ fontSize: '13px', color: '#10b981', fontWeight: 600, marginBottom: '4px' }}>アクティブユーザー</p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#065f46' }}>{stats.active_users_7d.toLocaleString()}</p>
              <p style={{ fontSize: '12px', color: '#6ee7b7', marginTop: '4px' }}>過去7日間にチェックインしたユニークユーザー</p>
            </div>
            <div style={{
              flex: '1 1 180px',
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: '12px',
              padding: '20px 24px',
            }}>
              <p style={{ fontSize: '13px', color: '#f97316', fontWeight: 600, marginBottom: '4px' }}>新規ユーザー (30日)</p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#9a3412' }}>
                {stats.daily_new_users.reduce((s, d) => s + d.count, 0).toLocaleString()}
              </p>
              <p style={{ fontSize: '12px', color: '#fdba74', marginTop: '4px' }}>過去30日間の新規登録</p>
            </div>
          </div>

          {/* 日別チャート */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <BarChart
              data={stats.daily_new_users}
              color="#3b82f6"
              label="日別 新規ユーザー数（過去30日）"
            />
          </div>

          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <BarChart
              data={stats.daily_active_users}
              color="#10b981"
              label="日別 アクティブユーザー数（チェックインユニーク、過去30日）"
            />
          </div>

          {/* スポット別ランキング */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '24px' }}>

            {/* チェックインが多いスポット */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>🏅 チェックインが多いスポット</h3>
              {stats.top_checkin_spots.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#9ca3af' }}>データなし</p>
              ) : (
                <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {stats.top_checkin_spots.map((s, i) => (
                    <li key={s.spot_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < stats.top_checkin_spots.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <span style={{ fontSize: '13px', color: '#374151' }}>
                        <span style={{ fontWeight: 700, color: '#6b7280', marginRight: '6px' }}>{i + 1}.</span>
                        {s.spot_name}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6', whiteSpace: 'nowrap', marginLeft: '8px' }}>{s.count.toLocaleString()} 回</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* クイズ正解率が高いスポット */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>✅ クイズ正解率が高いスポット</h3>
              {stats.top_quiz_correct_spots.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#9ca3af' }}>データなし（3回以上回答があるスポットが対象）</p>
              ) : (
                <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {stats.top_quiz_correct_spots.map((s, i) => (
                    <li key={s.spot_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < stats.top_quiz_correct_spots.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <span style={{ fontSize: '13px', color: '#374151' }}>
                        <span style={{ fontWeight: 700, color: '#6b7280', marginRight: '6px' }}>{i + 1}.</span>
                        {s.spot_name}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap', marginLeft: '8px' }}>{s.rate}% <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>({s.correct}/{s.answered})</span></span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* クイズ正解率が低いスポット */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>❌ クイズ正解率が低いスポット</h3>
              {stats.low_quiz_correct_spots.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#9ca3af' }}>データなし（3回以上回答があるスポットが対象）</p>
              ) : (
                <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {stats.low_quiz_correct_spots.map((s, i) => (
                    <li key={s.spot_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < stats.low_quiz_correct_spots.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <span style={{ fontSize: '13px', color: '#374151' }}>
                        <span style={{ fontWeight: 700, color: '#6b7280', marginRight: '6px' }}>{i + 1}.</span>
                        {s.spot_name}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', whiteSpace: 'nowrap', marginLeft: '8px' }}>{s.rate}% <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>({s.correct}/{s.answered})</span></span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}
