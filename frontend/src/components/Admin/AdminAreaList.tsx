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
    is_active: true
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
      is_active: area.is_active
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
      is_active: true
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
