import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddLinkIcon from '@mui/icons-material/AddLink';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MapIcon from '@mui/icons-material/Map';
import IconLabel from '../Common/IconLabel';
import {
  extractMyMapId,
  fetchMyMap,
  loadMyMapEntries,
  saveMyMapEntries,
  type MyMapEntry,
} from '../../utils/myMaps';

const iconButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '6px',
  cursor: 'pointer',
  color: '#6b7280',
  display: 'flex',
  alignItems: 'center',
};

// マイページに置く、Google マイマップの登録と表示切り替え。
// 一覧はこの端末の localStorage にだけ保存し、地図画面がそれを読んで重ねる
export default function MyMapsSection() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<MyMapEntry[]>(loadMyMapEntries);
  const [showInput, setShowInput] = useState(false);
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (next: MyMapEntry[]) => {
    setEntries(next);
    saveMyMapEntries(next);
  };

  const closeInput = () => {
    setShowInput(false);
    setUrl('');
    setError(null);
  };

  const handleAdd = async () => {
    if (adding) return;
    const mid = extractMyMapId(url);
    if (!mid) {
      setError('マイマップの URL を確認してください（「mid=」を含む URL が必要です）');
      return;
    }
    if (entries.some((e) => e.mid === mid)) {
      setError('この地図は追加済みです');
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const result = await fetchMyMap(mid);
      update([...entries, { mid, name: result.name, visible: true }]);
      closeInput();
    } catch (e) {
      console.error('マイマップの読み込みエラー:', e);
      setError('読み込めませんでした。マイマップの共有が「リンクを知っている全員」になっているか確認してください');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
        Google マイマップ
      </h3>
      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
        リンクで共有されているマイマップを、地図に重ねて表示します。この端末にだけ保存されます
      </p>

      {entries.map((entry) => (
        <div key={entry.mid} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '8px',
          padding: '8px 8px 8px 12px',
          backgroundColor: entry.visible ? '#fef2f2' : '#f9fafb',
          borderRadius: '8px',
          border: '2px solid',
          borderColor: entry.visible ? '#ea4335' : '#e5e7eb',
        }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0,
            fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={entry.visible}
              onChange={() => update(entries.map((e) => (e.mid === entry.mid ? { ...e, visible: !e.visible } : e)))}
              aria-label={`${entry.name}を地図に表示`}
              style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.name || 'マイマップ'}
            </span>
          </label>
          {entry.visible && (
            <button
              onClick={() => navigate(`/?mymap=${encodeURIComponent(entry.mid)}`)}
              style={iconButtonStyle}
              aria-label={`${entry.name}を地図で見る`}
            >
              <MapIcon style={{ fontSize: '20px' }} />
            </button>
          )}
          <button
            onClick={() => update(entries.filter((e) => e.mid !== entry.mid))}
            style={iconButtonStyle}
            aria-label={`${entry.name}を削除`}
          >
            <DeleteOutlineIcon style={{ fontSize: '20px' }} />
          </button>
        </div>
      ))}

      {!showInput && (
        <button
          onClick={() => setShowInput(true)}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: '#ea4335',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <IconLabel icon={AddLinkIcon}>マイマップURLを入力</IconLabel>
        </button>
      )}

      {showInput && (
        <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '12px', marginTop: '12px' }}>
          <label
            htmlFor="mymap-url"
            style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#991b1b' }}
          >
            マイマップの URL を入力
          </label>
          <input
            id="mymap-url"
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="https://www.google.com/maps/d/..."
            autoFocus
            style={{
              width: '100%',
              padding: '14px',
              border: '2px solid #fca5a5',
              borderRadius: '8px',
              fontSize: '16px',
              marginBottom: '12px',
              boxSizing: 'border-box'
            }}
          />
          {error && (
            <div role="alert" style={{ fontSize: '12px', color: '#b91c1c', marginBottom: '12px' }}>{error}</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={handleAdd}
              disabled={adding || !url.trim()}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#ea4335',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: adding || !url.trim() ? 'not-allowed' : 'pointer',
                opacity: adding || !url.trim() ? 0.5 : 1
              }}
            >
              {adding ? '読み込み中...' : '追加する'}
            </button>
            <button
              onClick={closeInput}
              disabled={adding}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: adding ? 'not-allowed' : 'pointer',
                opacity: adding ? 0.7 : 1
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
