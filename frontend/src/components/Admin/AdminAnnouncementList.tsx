import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAnnouncementApi } from '../../services/api';
import { storage } from '../../services/storage';
import type { Announcement } from '../../types';

export default function AdminAnnouncementList() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
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
      const data = await adminAnnouncementApi.getAll(password);
      setAnnouncements(data.announcements);
    } catch (error) {
      console.error('お知らせ取得エラー:', error);
      alert('お知らせの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？`)) return;
    const password = storage.getAdminPassword();
    if (!password) return;
    try {
      await adminAnnouncementApi.delete(password, id);
      setAnnouncements(prev => prev.filter(a => a.announcement_id !== id));
    } catch (error: any) {
      alert('削除に失敗しました: ' + error.message);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  const getStatus = (a: Announcement) => {
    if (!a.is_active) return { label: '無効', color: '#9ca3af' };
    if (today < a.start_date) return { label: '公開前', color: '#f59e0b' };
    if (today > a.end_date) return { label: '終了', color: '#6b7280' };
    return { label: '公開中', color: '#10b981' };
  };

  if (loading) return <div style={{ padding: '16px' }}>読み込み中...</div>;

  return (
    <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/admin/spots')}
        style={{
          marginBottom: '16px',
          padding: '8px 16px',
          backgroundColor: 'transparent',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        ← スポット一覧へ
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>お知らせ管理</h1>
        <button
          onClick={() => navigate('/admin/announcements/new')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          ＋ 新規作成
        </button>
      </div>

      {announcements.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          color: '#6b7280',
        }}>
          お知らせがまだ登録されていません
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {announcements.map(a => {
            const status = getStatus(a);
            return (
              <div
                key={a.announcement_id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: status.color + '20',
                          color: status.color,
                        }}
                      >
                        {status.label}
                      </span>
                      <span style={{ fontWeight: '700', fontSize: '16px' }}>{a.title}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 6px', whiteSpace: 'pre-line' }}>
                      {a.body.length > 80 ? a.body.slice(0, 80) + '…' : a.body}
                    </p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                      公開期間: {a.start_date} 〜 {a.end_date}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => navigate(`/admin/announcements/${a.announcement_id}/edit`)}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#f3f4f6',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(a.announcement_id, a.title)}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#fee2e2',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
