import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useNavigate } from 'react-router-dom';
import howtoContent from '../../content/howto.md?raw';

interface TocItem {
  level: 2 | 3;
  text: string;
  id: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '-')
    .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractToc(markdown: string): TocItem[] {
  const lines = markdown.split('\n');
  const toc: TocItem[] = [];
  for (const line of lines) {
    const m2 = line.match(/^##\s+(.+)/);
    const m3 = line.match(/^###\s+(.+)/);
    if (m2) toc.push({ level: 2, text: m2[1].replace(/\*\*/g, '').trim(), id: slugify(m2[1].trim()) });
    else if (m3) toc.push({ level: 3, text: m3[1].replace(/\*\*/g, '').trim(), id: slugify(m3[1].trim()) });
  }
  return toc;
}

const tocItems = extractToc(howtoContent);

export default function HowToPage() {
  const [tocOpen, setTocOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToId = (id: string) => {
    const el = scrollRef.current?.querySelector(`#${CSS.escape(id)}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setTocOpen(false);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* ヘッダーバー */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#6b7280',
              padding: '4px',
              lineHeight: 1,
            }}
            title="戻る"
          >
            ←
          </button>
          <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>
            📖 使い方
          </span>
        </div>
        <button
          onClick={() => setTocOpen((v) => !v)}
          title="目次"
          style={{
            padding: '4px 10px',
            backgroundColor: tocOpen ? '#dbeafe' : '#f3f4f6',
            color: tocOpen ? '#1e40af' : '#6b7280',
            border: '1px solid ' + (tocOpen ? '#bfdbfe' : '#e5e7eb'),
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          ≡ 目次
        </button>
      </div>

      {/* 目次パネル */}
      {tocOpen && (
        <div
          style={{
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f0f6ff',
            padding: '12px 20px',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
        >
          <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.05em' }}>
            目次
          </p>
          <nav>
            {tocItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToId(item.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: item.level === 2 ? '4px 0' : '3px 0 3px 16px',
                  fontSize: item.level === 2 ? '13px' : '12px',
                  fontWeight: item.level === 2 ? '600' : '400',
                  color: item.level === 2 ? '#1e40af' : '#4b5563',
                  borderLeft: item.level === 3 ? '2px solid #dbeafe' : 'none',
                  marginLeft: item.level === 3 ? '8px' : '0',
                }}
              >
                {item.level === 2 ? '· ' : ''}{item.text}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* コンテンツ */}
      <div
        ref={scrollRef}
        style={{
          maxWidth: '680px',
          margin: '0 auto',
          padding: '24px 20px 48px',
          fontSize: '14px',
          lineHeight: '1.7',
          color: '#374151',
        }}
      >
        <ReactMarkdown
          rehypePlugins={[rehypeRaw]}
          components={{
            h1: ({ children }) => (
              <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>
                {children}
              </h1>
            ),
            h2: ({ children }) => {
              const text = String(children).replace(/\*\*/g, '').trim();
              const id = slugify(text);
              return (
                <h2
                  id={id}
                  style={{ fontSize: '17px', fontWeight: 'bold', margin: '24px 0 10px', color: '#1e40af', borderBottom: '2px solid #dbeafe', paddingBottom: '4px', scrollMarginTop: '64px' }}
                >
                  {children}
                </h2>
              );
            },
            h3: ({ children }) => {
              const text = String(children).replace(/\*\*/g, '').trim();
              const id = slugify(text);
              return (
                <h3
                  id={id}
                  style={{ fontSize: '15px', fontWeight: 'bold', margin: '16px 0 6px', color: '#374151', scrollMarginTop: '64px' }}
                >
                  {children}
                </h3>
              );
            },
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
              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />
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
  );
}
