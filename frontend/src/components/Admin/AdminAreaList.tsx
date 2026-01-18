import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { storage } from '../../services/storage';
import type { Area } from '../../types';

export default function AdminAreaList() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [formData, setFormData] = useState({
    area_id: '',
    area_name: '',
    center_latitude: 35.6586,
    center_longitude: 139.7454,
    display_order: 0,
    is_active: true,
    available_genres: [] as string[],
    is_restricted: false,
    access_code: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    const password = storage.getAdminPassword();
    if (!password) {
      navigate('/admin');
      return;
    }
    loadAreas(password);
  }, [navigate]);

  const loadAreas = async (password: string) => {
    try {
      const data = await adminApi.getAreas(password);
      setAreas(data.sort((a, b) => a.display_order - b.display_order));
    } catch (error) {
      console.error('エリア取得エラー:', error);
      alert('エリアの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const password = storage.getAdminPassword();
    if (!password) return;

    setLoading(true);
    try {
      if (editingArea) {
        await adminApi.updateArea(password, editingArea.area_id, formData);
        alert('エリアを更新しました');
      } else {
        await adminApi.createArea(password, formData);
        alert('エリアを作成しました');
      }
      setShowForm(false);
      setEditingArea(null);
      resetForm();
      await loadAreas(password);
    } catch (error: any) {
      alert('エラー: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (area: Area) => {
    setEditingArea(area);
    setFormData({
      area_id: area.area_id,
      area_name: area.area_name,
      center_latitude: area.center_latitude,
      center_longitude: area.center_longitude,
      display_order: area.display_order,
      is_active: area.is_active,
      available_genres: area.available_genres || [],
      is_restricted: area.is_restricted || false,
      access_code: area.access_code || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (areaId: string) => {
    if (!confirm('このエリアを削除しますか？（論理削除されます）')) return;

    const password = storage.getAdminPassword();
    if (!password) return;

    setLoading(true);
    try {
      await adminApi.deleteArea(password, areaId);
      alert('エリアを削除しました');
      await loadAreas(password);
    } catch (error: any) {
      alert('エラー: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      area_id: '',
      area_name: '',
      center_latitude: 35.6586,
      center_longitude: 139.7454,
      display_order: 0,
      is_active: true,
      available_genres: [],
      is_restricted: false,
      access_code: ''
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingArea(null);
    resetForm();
  };

  if (loading && areas.length === 0) {
    return <div style={{ padding: '24px' }}>読み込み中...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>エリア管理</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/admin/spots')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ba8211',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            スポット管理
          </button>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ＋ 新規エリア
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ marginBottom: '16px' }}>
            {editingArea ? 'エリア編集' : '新規エリア作成'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                エリアID *
              </label>
              <input
                type="text"
                value={formData.area_id}
                onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                disabled={!!editingArea}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="例: akihabara"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                エリア名 *
              </label>
              <input
                type="text"
                value={formData.area_name}
                onChange={(e) => setFormData({ ...formData, area_name: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="例: 秋葉原"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  中心緯度 *
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.center_latitude}
                  onChange={(e) => setFormData({ ...formData, center_latitude: parseFloat(e.target.value) })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  中心経度 *
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.center_longitude}
                  onChange={(e) => setFormData({ ...formData, center_longitude: parseFloat(e.target.value) })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                表示順序
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                利用可能なジャンル
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="ジャンル名を入力"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.currentTarget;
                      const value = input.value.trim();
                      if (value && !formData.available_genres.includes(value)) {
                        setFormData({ ...formData, available_genres: [...formData.available_genres, value] });
                        input.value = '';
                      }
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    const value = input.value.trim();
                    if (value && !formData.available_genres.includes(value)) {
                      setFormData({ ...formData, available_genres: [...formData.available_genres, value] });
                      input.value = '';
                    }
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  追加
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                Enterキーまたは「追加」ボタンでジャンルを追加できます
              </p>
              {formData.available_genres.length > 0 ? (
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  flexWrap: 'wrap',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb'
                }}>
                  {formData.available_genres.map((genre, idx) => (
                    <span key={idx} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {genre}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ 
                            ...formData, 
                            available_genres: formData.available_genres.filter((_, i) => i !== idx) 
                          });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#92400e',
                          cursor: 'pointer',
                          fontSize: '18px',
                          lineHeight: '1',
                          padding: '0',
                          marginLeft: '4px'
                        }}
                        title="削除"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb',
                  color: '#9ca3af',
                  fontSize: '14px',
                  textAlign: 'center'
                }}>
                  ジャンルが設定されていません
                </div>
              )}
            </div>

            {/* エリア制限設定 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                エリア制限設定
              </label>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                制限を設定すると、コードを入力したユーザーのみこのエリアを表示できます。
              </p>
              <div style={{ 
                padding: '16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#f9fafb'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_restricted}
                    onChange={(e) => setFormData({ ...formData, is_restricted: e.target.checked })}
                    style={{ marginRight: '8px', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontWeight: '600' }}>このエリアを制限する</span>
                </label>
                {formData.is_restricted && (
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                      アクセスコード
                    </label>
                    <input
                      type="text"
                      placeholder="コードを入力"
                      value={formData.access_code}
                      onChange={(e) => setFormData({ ...formData, access_code: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {editingArea && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    style={{ marginRight: '8px', width: '20px', height: '20px' }}
                  />
                  <span style={{ fontWeight: '600' }}>有効</span>
                </label>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1
                }}
              >
                {loading ? '処理中...' : (editingArea ? '更新' : '作成')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '16px', textAlign: 'left' }}>順序</th>
              <th style={{ padding: '16px', textAlign: 'left' }}>エリアID</th>
              <th style={{ padding: '16px', textAlign: 'left' }}>エリア名</th>
              <th style={{ padding: '16px', textAlign: 'left' }}>中心座標</th>
              <th style={{ padding: '16px', textAlign: 'left' }}>ジャンル</th>
              <th style={{ padding: '16px', textAlign: 'center' }}>状態</th>
              <th style={{ padding: '16px', textAlign: 'center' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {areas.map((area) => (
              <tr key={area.area_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '16px' }}>{area.display_order}</td>
                <td style={{ padding: '16px', fontFamily: 'monospace' }}>{area.area_id}</td>
                <td style={{ padding: '16px', fontWeight: '600' }}>{area.area_name}</td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                  {area.center_latitude.toFixed(6)}, {area.center_longitude.toFixed(6)}
                </td>
                <td style={{ padding: '16px' }}>
                  {area.available_genres && area.available_genres.length > 0 ? (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {area.available_genres.map((g, idx) => (
                        <span key={idx} style={{
                          padding: '2px 8px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: '#fef3c7',
                          color: '#92400e'
                        }}>
                          {g}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '14px', color: '#9ca3af' }}>未設定</span>
                  )}
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: area.is_active ? '#dcfce7' : '#fee2e2',
                    color: area.is_active ? '#166534' : '#991b1b'
                  }}>
                    {area.is_active ? '有効' : '無効'}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleEdit(area)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginRight: '8px'
                    }}
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(area.area_id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {areas.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
            エリアがありません
          </div>
        )}
      </div>
    </div>
  );
}
