import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { storage } from '../../services/storage';
import { jstDaysAgo, jstToday } from '../../utils/date';
import IconLabel from '../Common/IconLabel';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';

type DailyEntry = { date: string; count: number };
type CheckinSpot = { spot_id: string; spot_name: string; count: number };
type QuizRateSpot = { spot_id: string; spot_name: string; answered: number; correct: number; rate: number };

type Stats = {
  period: { from: string; to: string };
  total_users: number;
  active_users: number;
  new_users: number;
  daily_new_users: DailyEntry[];
  daily_active_users: DailyEntry[];
  top_checkin_spots: CheckinSpot[];
  top_quiz_correct_spots: QuizRateSpot[];
  low_quiz_correct_spots: QuizRateSpot[];
};

// from・to が空なら、その側は制限なし（両方空で全期間）
const PERIOD_SHORTCUTS = [
  { label: '全期間', from: () => '', to: () => '' },
  { label: '過去30日', from: () => jstDaysAgo(29), to: jstToday },
  { label: '過去7日', from: () => jstDaysAgo(6), to: jstToday },
];

// これより日数が多いグラフは、棒を細くして棒ごとの数値を省く
const DENSE_CHART_DAYS = 45;

function BarChart({ data, color, label }: { data: DailyEntry[]; color: string; label: string }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const CHART_HEIGHT = 160;

  const dense = data.length > DENSE_CHART_DAYS;
  const showCounts = !dense;

  // 7日ごとにラベルを表示。期間が長いときは、ラベルが8個ほどになるよう間隔を広げる
  const labelStep = Math.max(7, Math.ceil(data.length / 8));
  const showLabel = (_: DailyEntry, i: number) => i % labelStep === 0 || (!dense && i === data.length - 1);

  // 年をまたぐ期間は、月日だけだと区別できない
  const spansYears = data.length > 0 && data[0].date.slice(0, 4) !== data[data.length - 1].date.slice(0, 4);

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>{label}</h3>
      <div style={{ overflowX: dense ? 'auto' : 'visible' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: dense ? 0 : '3px', height: `${CHART_HEIGHT}px`, position: 'relative', minWidth: dense ? `${data.length * 2}px` : undefined }}>
        {data.map((d, i) => {
          const barH = max === 0 ? 0 : Math.max(Math.round((d.count / max) * (CHART_HEIGHT - 20)), d.count > 0 ? 2 : 0);
          return (
            <div
              key={d.date}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', position: 'relative' }}
              title={`${d.date}: ${d.count}人`}
            >
              {showCounts && d.count > 0 && (
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
                  // 棒が密だと斜めのラベルは隣の棒に隠れるので水平にする。右半分は枠からはみ出さないよう左へ伸ばす
                  transform: dense ? (i >= data.length / 2 ? 'translateX(-100%)' : 'none') : 'rotate(-45deg)',
                  transformOrigin: 'top left',
                  whiteSpace: 'nowrap',
                  position: 'absolute',
                  bottom: '-20px',
                  left: '50%',
                }}>
                  {spansYears ? d.date : d.date.slice(5)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ height: '28px' }} />
      </div>
    </div>
  );
}

export default function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState(() => jstDaysAgo(29));
  const [to, setTo] = useState(() => jstToday());
  const navigate = useNavigate();

  const today = jstToday();
  const rangeInvalid = from !== '' && to !== '' && from > to;

  useEffect(() => {
    const password = storage.getAdminPassword();
    if (!password) {
      navigate('/admin');
      return;
    }
    if (rangeInvalid) {
      setLoading(false);
      return;
    }

    // 期間を続けて変えたとき、古い期間の応答で上書きしない
    let cancelled = false;
    setLoading(true);
    setError('');
    adminApi.getStats(password, { from, to })
      .then(data => {
        if (!cancelled) setStats(data);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setStats(null);
        setError('統計の取得に失敗しました: ' + e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, from, to, rangeInvalid]);

  const dateInputStyle = {
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: 'white',
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

      {/* 期間の指定 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {PERIOD_SHORTCUTS.map(shortcut => {
            const active = from === shortcut.from() && to === shortcut.to();
            return (
              <button
                key={shortcut.label}
                aria-pressed={active}
                onClick={() => {
                  setFrom(shortcut.from());
                  setTo(shortcut.to());
                }}
                style={{
                  padding: '6px 14px',
                  backgroundColor: active ? '#3b82f6' : 'white',
                  color: active ? 'white' : '#374151',
                  border: `1px solid ${active ? '#3b82f6' : '#d1d5db'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {shortcut.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="date"
            aria-label="開始日"
            value={from}
            max={to || today}
            onChange={e => setFrom(e.target.value)}
            style={dateInputStyle}
          />
          <span style={{ color: '#6b7280' }}>〜</span>
          <input
            type="date"
            aria-label="終了日"
            value={to}
            min={from || undefined}
            max={today}
            onChange={e => setTo(e.target.value)}
            style={dateInputStyle}
          />
        </div>
        <p style={{ fontSize: '13px', color: rangeInvalid ? '#ef4444' : '#6b7280', marginTop: '8px', minHeight: '20px' }}>
          {rangeInvalid
            ? '開始日は終了日より前にしてください'
            : loading
              ? '読み込み中...'
              : stats && `集計期間: ${stats.period.from} 〜 ${stats.period.to}（${stats.daily_new_users.length.toLocaleString()}日間、日本時間）`}
        </p>
      </div>

      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      {stats && !rangeInvalid && (
        <div style={{ opacity: loading ? 0.5 : 1 }}>
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
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#065f46' }}>{stats.active_users.toLocaleString()}</p>
              <p style={{ fontSize: '12px', color: '#6ee7b7', marginTop: '4px' }}>期間内にチェックインしたユニークユーザー</p>
            </div>
            <div style={{
              flex: '1 1 180px',
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: '12px',
              padding: '20px 24px',
            }}>
              <p style={{ fontSize: '13px', color: '#f97316', fontWeight: 600, marginBottom: '4px' }}>新規ユーザー</p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#9a3412' }}>
                {stats.new_users.toLocaleString()}
              </p>
              <p style={{ fontSize: '12px', color: '#fdba74', marginTop: '4px' }}>期間内の新規登録</p>
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
              label="日別 新規ユーザー数"
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
              label="日別 アクティブユーザー数（チェックインユニーク）"
            />
          </div>

          {/* スポット別ランキング */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '24px' }}>

            {/* チェックインが多いスポット */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}><IconLabel icon={EmojiEventsIcon} color="#d97706">チェックインが多いスポット</IconLabel></h3>
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
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}><IconLabel icon={CheckCircleOutlineIcon} color="#16a34a">クイズ正解率が高いスポット</IconLabel></h3>
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
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}><IconLabel icon={CancelOutlinedIcon} color="#dc2626">クイズ正解率が低いスポット</IconLabel></h3>
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
        </div>
      )}
    </div>
  );
}
