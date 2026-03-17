import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import howtoContent from '../../content/howto.md?raw';

interface HowToModalProps {
  /** ボタンのサイズ・スタイルを調整したいときに使う追加スタイル */
  buttonStyle?: React.CSSProperties;
}

export default function HowToModal({ buttonStyle }: HowToModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ? ボタン */}
      <button
        onClick={() => setOpen(true)}
        title="使い方"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: '#e0f2fe',
          color: '#0369a1',
          border: '1.5px solid #bae6fd',
          cursor: 'pointer',
          fontSize: '15px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          ...buttonStyle,
        }}
      >
        ?
      </button>

      {/* オーバーレイ */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          {/* モーダル本体 */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* ヘッダー */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid #e5e7eb',
                flexShrink: 0,
              }}
            >
              <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>
                📖 使い方
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: '#6b7280',
                  lineHeight: 1,
                  padding: '4px',
                }}
              >
                ×
              </button>
            </div>

            {/* コンテンツ */}
            <div
              style={{
                overflowY: 'auto',
                padding: '20px',
                fontSize: '14px',
                lineHeight: '1.7',
                color: '#374151',
              }}
            >
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: '#111827' }}>
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '20px 0 8px', color: '#1e40af', borderBottom: '2px solid #dbeafe', paddingBottom: '4px' }}>
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '14px 0 6px', color: '#374151' }}>
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p style={{ marginBottom: '8px' }}>{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul style={{ paddingLeft: '20px', marginBottom: '8px' }}>{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol style={{ paddingLeft: '20px', marginBottom: '8px' }}>{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li style={{ marginBottom: '4px' }}>{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong style={{ fontWeight: 'bold', color: '#1e40af' }}>{children}</strong>
                  ),
                  hr: () => (
                    <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />
                  ),
                  blockquote: ({ children }) => (
                    <blockquote style={{
                      borderLeft: '4px solid #fbbf24',
                      paddingLeft: '12px',
                      margin: '8px 0',
                      color: '#92400e',
                      backgroundColor: '#fffbeb',
                      padding: '8px 12px',
                      borderRadius: '0 6px 6px 0',
                    }}>
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code style={{ backgroundColor: '#f3f4f6', padding: '1px 4px', borderRadius: '4px', fontFamily: 'monospace' }}>
                      {children}
                    </code>
                  ),
                  img: ({ src, alt }) => (
                    <img
                      src={src}
                      alt={alt}
                      style={{
                        maxWidth: '100%',
                        borderRadius: '8px',
                        margin: '8px 0',
                        display: 'block',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      }}
                    />
                  ),
                }}
              >
                {howtoContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
