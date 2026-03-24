import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { storage } from '../../services/storage';
import { indexedDB } from '../../services/indexedDB';
import type { Spot, Area, QuizType, QuizWithType } from '../../types';
import { OpenLocationCode } from 'open-location-code';

export default function AdminSpotForm() {
  const { spotId } = useParams<{ spotId?: string }>();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [quizzes, setQuizzes] = useState<QuizWithType[]>([]);
  const [quizTypes, setQuizTypes] = useState<QuizType[]>([]);
  const [inputMethod, setInputMethod] = useState<'latlong' | 'pluscode'>('latlong');
  const [plusCode, setPlusCode] = useState('');
  const [plusCodeError, setPlusCodeError] = useState('');
  const [referenceLocation, setReferenceLocation] = useState({ lat: '', lng: '' });
  const [isShortCode, setIsShortCode] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const returnSearch = (location.state as { returnSearch?: string } | null)?.returnSearch ?? '';

  const [formData, setFormData] = useState({
    spot_name: '',
    reading: '',
    url: '',
    description: '',
    latitude: '',
    longitude: '',
    detection_radius: '100',
    images: [] as string[],
    genre: [] as string[],
    area: '',
  });

  useEffect(() => {
    if (!storage.getAdminPassword()) {
      navigate('/admin');
      return;
    }

    loadAreas();
    loadQuizTypes();

    if (spotId) {
      loadSpot();
    }
  }, [spotId]);

  const loadAreas = async () => {
    try {
      const cachedAreas = await indexedDB.getAllAreas();
      setAreas(cachedAreas);
    } catch (error) {
      console.error('エリア取得エラー:', error);
    }
  };

  const loadQuizTypes = async () => {
    try {
      const cachedTypes = await indexedDB.getAllQuizTypes();
      if (cachedTypes.length > 0) {
        setQuizTypes(cachedTypes.filter(t => t.is_active).sort((a, b) => a.display_order - b.display_order));
        return;
      }
      // キャッシュになければ API から取得
      const password = storage.getAdminPassword();
      if (password) {
        const types = await adminApi.getQuizTypes(password);
        setQuizTypes(types.filter(t => t.is_active).sort((a, b) => a.display_order - b.display_order));
      }
    } catch (error) {
      console.error('クイズタイプ取得エラー:', error);
    }
  };

  const loadSpot = async () => {
    if (!spotId) return;

    try {
      const spot = await indexedDB.getSpot(spotId);
      if (spot) {
        setFormData({
          spot_name: spot.spot_name,
          reading: spot.reading || '',
          url: spot.url || '',
          description: spot.description,
          latitude: spot.latitude.toString(),
          longitude: spot.longitude.toString(),
          detection_radius: spot.detection_radius.toString(),
          images: spot.images,
          genre: spot.genre || [],
          area: spot.area || '',
        });
        setQuizzes(spot.quizzes || []);
      }
    } catch (error) {
      console.error('スポット取得エラー:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const password = storage.getAdminPassword();
    if (!password) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const result = await adminApi.uploadImage(password, files[i]);
        uploadedUrls.push(result.url);
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      alert('画像のアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= formData.images.length) return;
    setFormData(prev => {
      const newImages = [...prev.images];
      const [moved] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, moved);
      return { ...prev, images: newImages };
    });
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== toIndex) {
      moveImage(dragIndex, toIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleChoiceChange = (quizIndex: number, choiceIndex: number, value: string) => {
    setQuizzes(prev => prev.map((q, i) => {
      if (i !== quizIndex) return q;
      const newChoices = [...q.choices];
      newChoices[choiceIndex] = value;
      return { ...q, choices: newChoices };
    }));
  };

  const addQuiz = () => {
    // 未使用のタイプを探す（デフォルト=null を含む）
    const usedTypes = new Set(quizzes.map(q => q.quiz_type_id));
    // デフォルト（null）がまだ使われていなければ先に追加
    const newTypeId = !usedTypes.has(null)
      ? null
      : quizTypes.find(t => !usedTypes.has(t.quiz_type_id))?.quiz_type_id ?? null;
    setQuizzes(prev => [...prev, {
      quiz_type_id: newTypeId,
      question: '',
      choices: ['', '', '', ''],
      correct_answer: 0,
      score: 10,
    }]);
  };

  const removeQuiz = (index: number) => {
    setQuizzes(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuizField = (index: number, field: keyof QuizWithType, value: any) => {
    setQuizzes(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const handlePlusCodeInput = (value: string) => {
    setPlusCode(value);
    setPlusCodeError('');

    if (!value.trim()) {
      setIsShortCode(false);
      return;
    }

    try {
      const olc = new (OpenLocationCode as any)();
      
      // 短縮コードかどうかをチェック
      if (olc.isShort(value)) {
        setIsShortCode(true);
        setPlusCodeError('');
        // 参照位置が入力されている場合は変換を試みる
        if (referenceLocation.lat && referenceLocation.lng) {
          convertShortCode(value, parseFloat(referenceLocation.lat), parseFloat(referenceLocation.lng));
        }
        return;
      }
      
      setIsShortCode(false);
      if (olc.isValid(value) && olc.isFull(value)) {
        const decoded = olc.decode(value);
        const latitude = decoded.latitudeCenter;
        const longitude = decoded.longitudeCenter;
        
        setFormData(prev => ({
          ...prev,
          latitude: latitude.toFixed(8),
          longitude: longitude.toFixed(8)
        }));
      } else {
        setPlusCodeError('無効なPlus Codeです');
      }
    } catch (error: any) {
      console.error('Plus Code conversion error:', error);
      setPlusCodeError('Plus Codeの変換に失敗しました');
    }
  };

  const convertShortCode = (shortCode: string, refLat: number, refLng: number) => {
    try {
      const olc = new (OpenLocationCode as any)();
      const fullCode = olc.recoverNearest(shortCode, refLat, refLng);
      const decoded = olc.decode(fullCode);
      const latitude = decoded.latitudeCenter;
      const longitude = decoded.longitudeCenter;
      
      setFormData(prev => ({
        ...prev,
        latitude: latitude.toFixed(8),
        longitude: longitude.toFixed(8)
      }));
      setPlusCodeError('');
    } catch (error: any) {
      console.error('Short code conversion error:', error);
      setPlusCodeError('短縮コードの変換に失敗しました');
    }
  };

  const handleReferenceLocationChange = (field: 'lat' | 'lng', value: string) => {
    const newRef = { ...referenceLocation, [field]: value };
    setReferenceLocation(newRef);
    
    // 両方の値が入力されていて、短縮コードが入力されている場合は変換
    if (newRef.lat && newRef.lng && plusCode && isShortCode) {
      convertShortCode(plusCode, parseFloat(newRef.lat), parseFloat(newRef.lng));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    if (!formData.spot_name.trim()) {
      alert('スポット名を入力してください');
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      alert('緯度経度を入力してください');
      return;
    }

    // クイズのバリデーション
    for (let i = 0; i < quizzes.length; i++) {
      const q = quizzes[i];
      if (!q.question.trim()) {
        alert(`クイズ ${i + 1}: 問題文を入力してください`);
        return;
      }
      const validChoices = q.choices.filter(c => c.trim());
      if (validChoices.length < 2) {
        alert(`クイズ ${i + 1}: 選択肢を2つ以上入力してください`);
        return;
      }
    }

    // クイズタイプの重複チェック
    const typeIds = quizzes.map(q => q.quiz_type_id);
    if (new Set(typeIds).size !== typeIds.length) {
      alert('同じクイズタイプが複数設定されています');
      return;
    }

    const password = storage.getAdminPassword();
    if (!password) return;

    setLoading(true);

    try {
      const spotData: any = {
        spot_name: formData.spot_name,
        reading: formData.reading || null,
        url: formData.url || null,
        description: formData.description,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        detection_radius: parseFloat(formData.detection_radius),
        images: formData.images,
        genre: formData.genre,
        area: formData.area || null,
        quizzes: quizzes.map(q => ({
          quiz_type_id: q.quiz_type_id,
          question: q.question,
          choices: q.choices.filter(c => c.trim()),
          correct_answer: q.correct_answer,
          score: q.score,
        })),
      };

      if (spotId) {
        await adminApi.updateSpot(password, spotId, spotData);
        alert('スポットを更新しました');
      } else {
        await adminApi.createSpot(password, spotData);
        alert('スポットを作成しました');
      }

      navigate('/admin/spots' + returnSearch);
    } catch (error: any) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/admin/spots' + returnSearch)}
        style={{
          marginBottom: '16px',
          padding: '8px 16px',
          backgroundColor: 'transparent',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        ← 一覧に戻る
      </button>

      <h1 style={{ marginBottom: '24px' }}>
        {spotId ? 'スポット編集' : '新規スポット作成'}
      </h1>

      <form onSubmit={handleSubmit}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '16px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>基本情報</h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              スポット名 *
            </label>
            <input
              type="text"
              value={formData.spot_name}
              onChange={(e) => setFormData({ ...formData, spot_name: e.target.value })}
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
              ふりがな
            </label>
            <input
              type="text"
              value={formData.reading}
              onChange={(e) => setFormData({ ...formData, reading: e.target.value })}
              placeholder="例：はすのそらこうえん"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
            <p style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
              名前順での並び替えに使用します（ユーザーには表示されません）
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              外部リンクURL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="例：https://example.com"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
            <p style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
              スポット詳細画面にリンクボタンとして表示されます
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              説明
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              ジャンル（複数選択可）
            </label>
            {!formData.area ? (
              <div style={{
                padding: '12px',
                border: '2px solid #fbbf24',
                borderRadius: '8px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                fontSize: '14px'
              }}>
                先にエリアを選択してください
              </div>
            ) : (() => {
              const selectedArea = areas.find(a => a.area_id === formData.area);
              const availableGenres = selectedArea?.available_genres || [];
              
              return availableGenres.length === 0 ? (
                <div style={{
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb',
                  color: '#6b7280',
                  fontSize: '14px'
                }}>
                  このエリアにはジャンルが設定されていません
                </div>
              ) : (
                <>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '12px',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#f9fafb'
                  }}>
                    {availableGenres.map(g => (
                      <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.genre.includes(g)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, genre: [...formData.genre, g] });
                            } else {
                              setFormData({ ...formData, genre: formData.genre.filter(item => item !== g) });
                            }
                          }}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span>{g}</span>
                      </label>
                    ))}
                  </div>
                  {formData.genre.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
                      選択中: {formData.genre.join(', ')}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              エリア
            </label>
            <select
              value={formData.area}
              onChange={(e) => {
                const newAreaId = e.target.value;
                const newArea = areas.find(a => a.area_id === newAreaId);
                const availableGenres = newArea?.available_genres || [];
                
                // エリア変更時、新しいエリアで利用できないジャンルを除外
                const validGenres = formData.genre.filter(g => availableGenres.includes(g));
                
                setFormData({ 
                  ...formData, 
                  area: newAreaId,
                  genre: validGenres
                });
              }}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: 'white'
              }}
            >
              <option value="">エリア未設定</option>
              {areas.filter(a => a.is_active).map(area => (
                <option key={area.area_id} value={area.area_id}>
                  {area.area_name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              位置情報入力方法 *
            </label>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="latlong"
                  checked={inputMethod === 'latlong'}
                  onChange={(e) => setInputMethod(e.target.value as 'latlong')}
                  style={{ cursor: 'pointer' }}
                />
                <span>緯度経度</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="pluscode"
                  checked={inputMethod === 'pluscode'}
                  onChange={(e) => setInputMethod(e.target.value as 'pluscode')}
                  style={{ cursor: 'pointer' }}
                />
                <span>Plus Code</span>
              </label>
            </div>
          </div>

          {inputMethod === 'pluscode' && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Plus Code *
                </label>
                <input
                  type="text"
                  value={plusCode}
                  onChange={(e) => handlePlusCodeInput(e.target.value)}
                  placeholder="完全: 8Q7XRW6G+QQ または 短縮: HM97+QH"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: plusCodeError ? '2px solid #ef4444' : '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
                {plusCodeError && (
                  <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>
                    {plusCodeError}
                  </p>
                )}
                {plusCode && !plusCodeError && formData.latitude && formData.longitude && (
                  <p style={{ color: '#10b981', fontSize: '14px', marginTop: '4px' }}>
                    ✓ 緯度: {formData.latitude}, 経度: {formData.longitude}
                  </p>
                )}
              </div>

              {isShortCode && (
                <div style={{ 
                  marginBottom: '16px', 
                  padding: '16px', 
                  backgroundColor: '#fef3c7', 
                  borderRadius: '8px',
                  border: '1px solid #fbbf24'
                }}>
                  <p style={{ fontSize: '14px', marginBottom: '12px', fontWeight: '600' }}>
                    短縮形式のPlus Codeです。参照位置の緯度経度を入力してください
                  </p>
                  <p style={{ fontSize: '12px', color: '#92400e', marginBottom: '12px' }}>
                    Google Mapsで該当地域を表示し、地図上の任意の場所をクリックすると緯度経度が表示されます
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>
                        参照位置 緯度 *
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={referenceLocation.lat}
                        onChange={(e) => handleReferenceLocationChange('lat', e.target.value)}
                        placeholder="例: 36.5"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '2px solid #d97706',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>
                        参照位置 経度 *
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={referenceLocation.lng}
                        onChange={(e) => handleReferenceLocationChange('lng', e.target.value)}
                        placeholder="例: 136.6"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '2px solid #d97706',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                緯度 *
              </label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                disabled={inputMethod === 'pluscode'}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: inputMethod === 'pluscode' ? '#f3f4f6' : 'white',
                  cursor: inputMethod === 'pluscode' ? 'not-allowed' : 'text'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                経度 *
              </label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                disabled={inputMethod === 'pluscode'}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: inputMethod === 'pluscode' ? '#f3f4f6' : 'white',
                  cursor: inputMethod === 'pluscode' ? 'not-allowed' : 'text'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              検知距離（メートル）
            </label>
            <input
              type="number"
              value={formData.detection_radius}
              onChange={(e) => setFormData({ ...formData, detection_radius: e.target.value })}
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

        {/* 画像 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '16px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>画像</h2>

          {formData.images.length > 0 && (
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
              ドラッグ&ドロップ、または ◀ ▶ ボタンで順序を変更できます
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {formData.images.map((url, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                style={{
                  position: 'relative',
                  cursor: 'grab',
                  opacity: dragIndex === index ? 0.4 : 1,
                  outline: dragOverIndex === index && dragIndex !== index ? '2px dashed #3b82f6' : 'none',
                  borderRadius: '8px',
                  transition: 'opacity 0.2s'
                }}
              >
                <img
                  src={url}
                  alt={`Image ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    display: 'block',
                    userSelect: 'none',
                    pointerEvents: 'none'
                  }}
                />
                {/* 順番バッジ */}
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  left: '6px',
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 6px',
                  userSelect: 'none'
                }}>
                  {index + 1}
                </div>
                {/* 削除ボタン */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    padding: '3px 7px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  削除
                </button>
                {/* 移動ボタン */}
                <div style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '4px'
                }}>
                  <button
                    type="button"
                    onClick={() => moveImage(index, index - 1)}
                    disabled={index === 0}
                    style={{
                      padding: '3px 8px',
                      backgroundColor: index === 0 ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.55)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '13px',
                      cursor: index === 0 ? 'default' : 'pointer'
                    }}
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, index + 1)}
                    disabled={index === formData.images.length - 1}
                    style={{
                      padding: '3px 8px',
                      backgroundColor: index === formData.images.length - 1 ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.55)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '13px',
                      cursor: index === formData.images.length - 1 ? 'default' : 'pointer'
                    }}
                  >
                    ▶
                  </button>
                </div>
              </div>
            ))}
          </div>

          <label style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: uploading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            borderRadius: '8px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {uploading ? 'アップロード中...' : '画像を追加'}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* クイズ */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '16px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px' }}>クイズ（任意）</h2>
            <button
              type="button"
              onClick={addQuiz}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              ＋ クイズを追加
            </button>
          </div>

          {quizzes.length === 0 && (
            <p style={{ color: '#6b7280', fontSize: '14px' }}>クイズが設定されていません</p>
          )}

          {quizzes.map((quiz, quizIndex) => {
            // このクイズ以外で使われているタイプID一覧
            const usedTypes = new Set(quizzes.filter((_, i) => i !== quizIndex).map(q => q.quiz_type_id));
            return (
              <div key={quizIndex} style={{
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                position: 'relative',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                    クイズ {quizIndex + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeQuiz(quizIndex)}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    削除
                  </button>
                </div>

                {/* クイズタイプ選択 */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                    クイズタイプ
                  </label>
                  <select
                    value={quiz.quiz_type_id ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : e.target.value;
                      updateQuizField(quizIndex, 'quiz_type_id', val);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '15px',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="" disabled={usedTypes.has(null)}>
                      デフォルト（タイプ未設定）{usedTypes.has(null) ? ' ─ 使用中' : ''}
                    </option>
                    {quizTypes.map(qt => (
                      <option key={qt.quiz_type_id} value={qt.quiz_type_id} disabled={usedTypes.has(qt.quiz_type_id)}>
                        {qt.name}{usedTypes.has(qt.quiz_type_id) ? ' ─ 使用中' : ''}
                      </option>
                    ))}
                  </select>
                  {quizTypes.length === 0 && (
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      クイズタイプが未登録です。管理画面から先に登録してください。
                    </p>
                  )}
                </div>

                {/* 問題文 */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                    問題文 *
                  </label>
                  <input
                    type="text"
                    value={quiz.question}
                    onChange={(e) => updateQuizField(quizIndex, 'question', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '15px',
                    }}
                  />
                </div>

                {/* 選択肢 */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                    選択肢（2〜4個）*
                  </label>
                  {quiz.choices.map((choice, choiceIndex) => (
                    <div key={choiceIndex} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="radio"
                        name={`correct_answer_${quizIndex}`}
                        checked={quiz.correct_answer === choiceIndex}
                        onChange={() => updateQuizField(quizIndex, 'correct_answer', choiceIndex)}
                      />
                      <input
                        type="text"
                        value={choice}
                        onChange={(e) => handleChoiceChange(quizIndex, choiceIndex, e.target.value)}
                        placeholder={`選択肢 ${choiceIndex + 1}`}
                        style={{
                          flex: 1,
                          padding: '10px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '15px',
                        }}
                      />
                    </div>
                  ))}
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    ラジオボタンで正解を選択してください
                  </p>
                </div>

                {/* 得点 */}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                    得点
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quiz.score}
                    onChange={(e) => updateQuizField(quizIndex, 'score', parseInt(e.target.value) || 1)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '15px',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 保存ボタン */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '保存中...' : (spotId ? '更新' : '作成')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/spots' + returnSearch)}
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: '#e5e7eb',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}