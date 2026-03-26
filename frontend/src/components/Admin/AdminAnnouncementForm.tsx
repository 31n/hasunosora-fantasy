import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminAnnouncementApi } from '../../services/api';
import { storage } from '../../services/storage';

export default function AdminAnnouncementForm() {
  const navigate = useNavigate();
  const { announcementId } = useParams<{ announcementId: string }>();
  const isEdit = !!announcementId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    start_date: today,
    end_date: today,
    is_active: true,
  });

  useEffect(() => {
    const password = storage.getAdminPassword();
    if (!password) {
      navigate('/admin');
      return;
    }
    if (isEdit && announcementId) {
      loadAnnouncement(password, announcementId);
    }
  }, [navigate, isEdit, announcementId]);

  const loadAnnouncement = async (password: string, id: string) => {
    try {
      const data = await adminAnnouncementApi.getAll(password);
      const item = data.announcements.find(a => a.announcement_id === id);
      if (!item) {
        alert('お知らせが見つかりません');
        navigate('/admin/announcements');
        return;
      }
      setFormData({
        title: item.title,
        body: item.body,
        start_date: item.start_date,
        end_date: item.end_date,
        is_active: item.is_active,
      });
    } catch (error) {
      console.error('お知らせ取得エラー:', error);
      alert('お知らせの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('タイトルを入力してください');
      return;
    }
    if (!formData.body.trim()) {
      alert('本文を入力してください');
      return;
    }
    if (formData.start_date > formData.end_date) {
      alert('開始日は終了日より前に設定してください');
      return;
    }

    const password = storage.getAdminPassword();
    if (!password) return;

    setSaving(true);
    try {
      if (isEdit && announcementId) {
        await adminAnnouncementApi.update(password, announcementId, formData);
      } else {
        await adminAnnouncementApi.create(password, formData);
      }
      navigate('/admin/announcements');
    } catch (error: any) {
      alert('保存に失敗しました: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '16px' }}>読み込み中...</div>;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  };

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/admin/announcements')}
        style={{
          marginBottom: '16px',
          padding: '8px 16px',
          backgroundColor: 'transparent',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        ← お知らせ一覧へ
      </button>

      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
        {isEdit ? 'お知らせ編集' : 'お知らせ新規作成'}
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* タイトル */}
        <div>
          <label style={labelStyle}>
            タイトル <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={e => handleChange('title', e.target.value)}
            placeholder="例: メンテナンスのお知らせ"
            style={inputStyle}
            maxLength={100}
          />
        </div>

        {/* 本文 */}
        <div>
          <label style={labelStyle}>
            本文 <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            value={formData.body}
            onChange={e => handleChange('body', e.target.value)}
            placeholder="お知らせの内容を入力してください"
            style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
            maxLength={1000}
          />
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', textAlign: 'right' }}>
            {formData.body.length} / 1000
          </p>
        </div>

        {/* 公開期間 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>
              開始日 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={e => handleChange('start_date', e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>
              終了日 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={e => handleChange('end_date', e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* 有効/無効 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={e => handleChange('is_active', e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="is_active" style={{ fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer' }}>
            有効（チェックを外すと非表示）
          </label>
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '12px',
            backgroundColor: saving ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? '保存中...' : (isEdit ? '更新する' : '作成する')}
        </button>
      </form>
    </div>
  );
}
