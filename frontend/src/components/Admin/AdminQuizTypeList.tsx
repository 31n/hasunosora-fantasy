import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { storage } from '../../services/storage';
import type { QuizType } from '../../types';

export default function AdminQuizTypeList() {
  const [quizTypes, setQuizTypes] = useState<QuizType[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const password = storage.getAdminPassword();
    if (!password) {
      navigate('/admin');
      return;
    }
    loadQuizTypes(password);
  }, [navigate]);

  const loadQuizTypes = async (password: string) => {
    try {
      const data = await adminApi.getQuizTypes(password);
      setQuizTypes(data.sort((a, b) => a.display_order - b.display_order));
    } catch (error) {
      console.error('クイズタイプ取得エラー:', error);
      alert('クイズタイプの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (quizTypeId: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？\n※このタイプに紐づくクイズは引き続きスポットに残ります。`)) return;

    const password = storage.getAdminPassword();
    if (!password) return;

    try {
      await adminApi.deleteQuizType(password, quizTypeId);
      setQuizTypes(prev => prev.filter(qt => qt.quiz_type_id !== quizTypeId));
    } catch (error: any) {
      alert('削除に失敗しました: ' + error.message);
    }
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
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>クイズタイプ管理</h1>
        <button
          onClick={() => navigate('/admin/quiz-types/new')}
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

      {quizTypes.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          color: '#6b7280',
        }}>
          クイズタイプがまだ登録されていません
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {quizTypes.map(qt => (
            <div
              key={qt.quiz_type_id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: qt.is_active ? 1 : 0.5,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px' }}>{qt.name}</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>ID: {qt.quiz_type_id}</span>
                  {!qt.is_active && (
                    <span style={{
                      fontSize: '11px',
                      backgroundColor: '#f3f4f6',
                      color: '#6b7280',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                    }}>
                      非アクティブ
                    </span>
                  )}
                </div>
                {qt.description && (
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{qt.description}</p>
                )}
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>
                  表示順: {qt.display_order}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => navigate(`/admin/quiz-types/${qt.quiz_type_id}/edit`)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  編集
                </button>
                <button
                  onClick={() => handleDelete(qt.quiz_type_id, qt.name)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#fee2e2',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
