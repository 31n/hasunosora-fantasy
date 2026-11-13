import { useState } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import type { MyMapEntry } from '../../utils/myMaps';
import type { MyMapStatus } from '../../hooks/useMyMaps';

interface MyMapsSettingsProps {
  entries: MyMapEntry[];
  status: Record<string, MyMapStatus>;
  onAdd: (input: string) => Promise<string | null>;
  onToggle: (mid: string) => void;
  onRemove: (mid: string) => void;
  onReload: (mid: string) => void;
  onFocus: (mid: string) => void;
}

const iconButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '6px',
  cursor: 'pointer',
  color: '#6b7280',
  display: 'flex',
  alignItems: 'center',
};

// フィルター画面に置く、Google マイマップの追加と表示切り替え
export default function MyMapsSettings({ entries, status, onAdd, onToggle, onRemove, onReload, onFocus }: MyMapsSettingsProps) {
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (adding || !url.trim()) return;
    setAdding(true);
    setError(null);
    const message = await onAdd(url);
    setAdding(false);
    if (message) setError(message);
    else setUrl('');
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
        Google マイマップを重ねる
      </div>

      {entries.map((entry) => (
        <div key={entry.mid} style={{ marginBottom: '8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
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
                onChange={() => onToggle(entry.mid)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.name || 'マイマップ'}
              </span>
            </label>
            {entry.visible && status[entry.mid] === 'ready' && (
              <button onClick={() => onFocus(entry.mid)} style={iconButtonStyle} aria-label={`${entry.name}の場所へ移動`}>
                <CenterFocusStrongIcon style={{ fontSize: '20px' }} />
              </button>
            )}
            <button onClick={() => onReload(entry.mid)} style={iconButtonStyle} aria-label={`${entry.name}を読み込み直す`}>
              <RefreshIcon style={{ fontSize: '20px' }} />
            </button>
            <button onClick={() => onRemove(entry.mid)} style={iconButtonStyle} aria-label={`${entry.name}を削除`}>
              <DeleteOutlineIcon style={{ fontSize: '20px' }} />
            </button>
          </div>
          {entry.visible && status[entry.mid] === 'loading' && (
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>読み込み中...</div>
          )}
          {entry.visible && status[entry.mid] === 'error' && (
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#b91c1c' }}>
              読み込めませんでした。通信状況と、マイマップの共有設定を確認してください
            </div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="マイマップの URL を貼り付け"
          aria-label="マイマップの URL"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '10px 12px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '16px',
          }}
        />
        <button
          onClick={handleAdd}
          disabled={adding || !url.trim()}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: adding || !url.trim() ? '#d1d5db' : '#14b8a6',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: adding || !url.trim() ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {adding ? '追加中...' : '追加'}
        </button>
      </div>
      {error && (
        <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c' }} role="alert">{error}</div>
      )}
      <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>
        リンクで共有されているマイマップを表示できます。追加した地図はこの端末にだけ保存されます
      </div>
    </div>
  );
}
