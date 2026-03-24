import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { storage } from '../../services/storage';
import type { QuizType } from '../../types';

export default function AdminQuizTypeForm() {
  const navigate = useNavigate();
  const { quizTypeId } = useParams<{ quizTypeId: string }>();
  const isEdit = !!quizTypeId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    quiz_type_id: '',
    name: '',
    description: '',
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    const password = storage.getAdminPassword();
    if (!password) {
      navigate('/admin');
      return;
    }
    if (isEdit && quizTypeId) {
      loadQuizType(password, quizTypeId);
    }
  }, [navigate, isEdit, quizTypeId]);

  const loadQuizType = async (password: string, id: string) => {
    try {
      const data = await adminApi.getQuizTypes(password);
      const qt = data.find((q: QuizType) => q.quiz_type_id === id);
      if (!qt) {
        alert('クイズタイプが見つかりません');
        navigate('/admin/quiz-types');
        return;
      }
      setFormData({
        quiz_type_id: qt.quiz_type_id,
        name: qt.name,
        description: qt.description || '',
        display_order: qt.display_order,
        is_active: qt.is_active,
      });
    } catch (error) {
      console.error('クイズタイプ取得エラー:', error);
      alert('クイズタイプの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('クイズタイプ名を入力してください');
      return;
    }
    if (!isEdit && !formData.quiz_type_id.trim()) {
      alert('クイズタイプIDを入力してください');
      return;
    }
    if (!isEdit && !/^[a-z0-9_]+$/.test(formData.quiz_type_id)) {
      alert('クイズタイプIDは英小文字・数字・アンダースコアのみ使用できます');
      return;
    }

    const password = storage.getAdminPassword();
    if (!password) return;

    setSaving(true);
    try {
      if (isEdit) {
        await adminApi.updateQuizType(password, formData.quiz_type_id, {
          name: formData.name,
          description: formData.description,
          display_order: formData.display_order,
          is_active: formData.is_active,
        });
      } else {
        await adminApi.createQuizType(password, {
          quiz_type_id: formData.quiz_type_id,
          name: formData.name,
          description: formData.description,
          display_order: formData.display_order,
          is_active: formData.is_active,
        });
      }
      navigate('/admin/quiz-types');
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
        onClick={() => navigate('/admin/quiz-types')}
        style={{
          marginBottom: '16px',
          padding: '8px 16px',
          backgroundColor: 'transparent',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        ← クイズタイプ一覧へ
      </button>

      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
        {isEdit ? 'クイズタイプ編集' : 'クイズタイプ新規作成'}
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {!isEdit && (
          <div>
            <label style={labelStyle}>
              クイズタイプID <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.quiz_type_id}
              onChange={e => handleChange('quiz_type_id', e.target.value)}
              placeholder="例: history, nature, culture"
              style={inputStyle}
              required
            />
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              英小文字・数字・アンダースコアのみ。作成後は変更できません。
            </p>
          </div>
        )}

        {isEdit && (
          <div>
            <label style={labelStyle}>クイズタイプID</label>
            <input
              type="text"
              value={formData.quiz_type_id}
              disabled
              style={{ ...inputStyle, backgroundColor: '#f9fafb', color: '#6b7280' }}
            />
          </div>
        )}

        <div>
          <label style={labelStyle}>
            名前 <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            placeholder="例: 歴史クイズ"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>説明（任意）</label>
          <textarea
            value={formData.description}
            onChange={e => handleChange('description', e.target.value)}
            placeholder="クイズタイプの説明を入力..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div>
          <label style={labelStyle}>表示順</label>
          <input
            type="number"
            value={formData.display_order}
            onChange={e => handleChange('display_order', parseInt(e.target.value) || 0)}
            min={0}
            style={{ ...inputStyle, width: '120px' }}
          />
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            数値が小さいほど先頭に表示されます
          </p>
        </div>

        <div>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={e => handleChange('is_active', e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            アクティブ（ユーザーが選択可能）
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '12px 24px',
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
