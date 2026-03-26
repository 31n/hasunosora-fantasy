import { useState } from 'react';
import type { Announcement } from '../../types';

interface Props {
  announcements: Announcement[];
  onClose: () => void;
}

export default function AnnouncementModal({ announcements, onClose }: Props) {
  const [index, setIndex] = useState(0);

  if (announcements.length === 0) return null;

  const current = announcements[index];
  const total = announcements.length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '28px 24px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>📢</span>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#111827', flex: 1 }}>
            お知らせ
          </h2>
          {total > 1 && (
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              {index + 1} / {total}
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              color: '#9ca3af',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '2px',
            }}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {/* 区切り線 */}
        <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', marginBottom: '16px' }} />

        {/* タイトル */}
        <h3 style={{ margin: '0 0 10px', fontSize: '17px', fontWeight: '700', color: '#1f2937' }}>
          {current.title}
        </h3>

        {/* 本文 */}
        <p style={{
          margin: '0 0 16px',
          fontSize: '14px',
          color: '#4b5563',
          lineHeight: '1.7',
          whiteSpace: 'pre-line',
        }}>
          {current.body}
        </p>

        {/* 公開期間 */}
        <p style={{ fontSize: '11px', color: '#d1d5db', margin: '0 0 20px', textAlign: 'right' }}>
          {current.start_date} 〜 {current.end_date}
        </p>

        {/* ナビゲーション or 閉じるボタン */}
        {total > 1 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <button
              onClick={() => setIndex(i => Math.max(0, i - 1))}
              disabled={index === 0}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: index === 0 ? '#f3f4f6' : '#e5e7eb',
                color: index === 0 ? '#d1d5db' : '#374151',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: index === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ← 前へ
            </button>
            {index < total - 1 ? (
              <button
                onClick={() => setIndex(i => i + 1)}
                style={{
                  flex: 2,
                  padding: '10px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                次へ →
              </button>
            ) : (
              <button
                onClick={onClose}
                style={{
                  flex: 2,
                  padding: '10px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                閉じる
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            閉じる
          </button>
        )}
      </div>
    </div>
  );
}
