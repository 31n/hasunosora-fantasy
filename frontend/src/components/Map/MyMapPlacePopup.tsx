import CloseIcon from '@mui/icons-material/Close';
import PlaceIcon from '@mui/icons-material/Place';
import DirectionsIcon from '@mui/icons-material/Directions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import IconLabel from '../Common/IconLabel';
import { formatDistance } from '../../utils/distance';
import type { MyMapPlace } from '../../hooks/useMyMaps';
import { MYMAP_CHECKIN_RADIUS } from '../../utils/myMaps';

interface MyMapPlacePopupProps {
  place: MyMapPlace;
  distance: number | null;
  // today = 今日チェックイン済み、past = 前にチェックインしたことがある
  status: 'none' | 'today' | 'past';
  onCheckin: () => void;
  onClose: () => void;
}

// マイマップの場所を押したときのカード。見た目はスポットのカード（SpotPopup のコンパクト表示）にそろえる
export default function MyMapPlacePopup({ place, distance, status, onCheckin, onClose }: MyMapPlacePopupProps) {
  const isInRange = distance !== null && distance <= MYMAP_CHECKIN_RADIUS;
  const checkinDisabled = !isInRange || status === 'today';

  const handleDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div
      role="dialog"
      aria-label={place.name}
      style={{
        position: 'fixed',
        bottom: 'calc(80px + env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '400px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        animation: 'myMapPlaceSlideUp 0.3s ease-out',
        // カードの上でスワイプしても、裏の画面が動かないようにする（タップはそのまま効く）
        touchAction: 'none'
      }}
    >
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', wordBreak: 'break-word' }}>
              {place.name}
            </h3>
            {distance !== null && (
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                <IconLabel icon={PlaceIcon} size={16} gap={2}>{formatDistance(distance)}</IconLabel>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="閉じる"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CloseIcon />
          </button>
        </div>

        {(place.mapName || place.layer) && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {/* レイヤー名は、スポットのジャンルと同じ見た目で出す */}
            {place.layer && (
              <span style={{
                display: 'inline-block',
                maxWidth: '100%',
                padding: '4px 12px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                boxSizing: 'border-box'
              }}>
                {place.layer}
              </span>
            )}
            {place.mapName && <span style={{
              display: 'inline-block',
              maxWidth: '100%',
              padding: '4px 12px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box'
            }}>
              マイマップ：{place.mapName}
            </span>}
          </div>
        )}

        {place.description && (
          <div style={{
            maxHeight: '120px',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            marginBottom: '12px',
            fontSize: '14px',
            lineHeight: 1.6,
            color: '#374151',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {place.description}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* チェックイン（ピンだけ。記録はこの端末にだけ残る） */}
        {place.placeKey && (
          <button
            onClick={onCheckin}
            disabled={checkinDisabled}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: checkinDisabled ? '#d1d5db' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: checkinDisabled ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <CheckCircleIcon fontSize="small" />
            {status === 'today'
              ? '本日チェックイン済み'
              : distance === null
                ? '現在地がわかりません'
                : !isInRange
                  ? 'スポットから離れすぎています'
                  : status === 'past' ? '再チェックイン' : 'チェックイン'}
          </button>
        )}
        <button
          onClick={handleDirections}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'white',
            color: '#3b82f6',
            border: '2px solid #e5e7eb',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <DirectionsIcon fontSize="small" />
          経路を調べる
        </button>
        </div>
      </div>

      <style>{`
        @keyframes myMapPlaceSlideUp {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
