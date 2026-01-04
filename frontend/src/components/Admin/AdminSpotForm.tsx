import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { storage } from '../../services/storage';
import { indexedDB } from '../../services/indexedDB';
import type { Spot } from '../../types';
import { OpenLocationCode } from 'open-location-code';

export default function AdminSpotForm() {
  const { spotId } = useParams<{ spotId?: string }>();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasQuiz, setHasQuiz] = useState(true);
  const [inputMethod, setInputMethod] = useState<'latlong' | 'pluscode'>('latlong');
  const [plusCode, setPlusCode] = useState('');
  const [plusCodeError, setPlusCodeError] = useState('');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    spot_name: '',
    description: '',
    latitude: '',
    longitude: '',
    detection_radius: '100',
    images: [] as string[],
    genre: '',
    quiz: {
      question: '',
      choices: ['', '', '', ''],
      correct_answer: 0,
      score: 10
    }
  });

  useEffect(() => {
    if (!storage.getAdminPassword()) {
      navigate('/admin');
      return;
    }

    if (spotId) {
      loadSpot();
    }
  }, [spotId]);

  const loadSpot = async () => {
    if (!spotId) return;

    try {
      const spot = await indexedDB.getSpot(spotId);
      if (spot) {
        setFormData({
          spot_name: spot.spot_name,
          description: spot.description,
          latitude: spot.latitude.toString(),
          longitude: spot.longitude.toString(),
          detection_radius: spot.detection_radius.toString(),
          images: spot.images,
          genre: spot.genre || '',
          quiz: spot.quiz || {
            question: '',
            choices: ['', '', '', ''],
            correct_answer: 0,
            score: 10
          }
        });
        setHasQuiz(!!spot.quiz);
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

  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...formData.quiz.choices];
    newChoices[index] = value;
    setFormData(prev => ({
      ...prev,
      quiz: { ...prev.quiz, choices: newChoices }
    }));
  };

  const handlePlusCodeInput = (value: string) => {
    setPlusCode(value);
    setPlusCodeError('');

    if (!value.trim()) {
      return;
    }

    try {
      if (OpenLocationCode.isValid(value)) {
        const decoded = OpenLocationCode.decode(value);
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
    } catch (error) {
      setPlusCodeError('Plus Codeの変換に失敗しました');
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

    // クイズのバリデーション（クイズありの場合のみ）
    if (hasQuiz) {
      if (!formData.quiz.question.trim()) {
        alert('クイズの問題文を入力してください');
        return;
      }

      const validChoices = formData.quiz.choices.filter(c => c.trim());
      if (validChoices.length < 2) {
        alert('選択肢を2つ以上入力してください');
        return;
      }
    }

    const password = storage.getAdminPassword();
    if (!password) return;

    setLoading(true);

    try {
      const spotData: any = {
        spot_name: formData.spot_name,
        description: formData.description,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        detection_radius: parseFloat(formData.detection_radius),
        images: formData.images,
        genre: formData.genre
      };

      // クイズがある場合のみ追加
      if (hasQuiz) {
        const validChoices = formData.quiz.choices.filter(c => c.trim());
        spotData.quiz = {
          question: formData.quiz.question,
          choices: validChoices,
          correct_answer: formData.quiz.correct_answer,
          score: formData.quiz.score
        };
      } else {
        spotData.quiz = null;
      }

      if (spotId) {
        await adminApi.updateSpot(password, spotId, spotData);
        alert('スポットを更新しました');
      } else {
        await adminApi.createSpot(password, spotData);
        alert('スポットを作成しました');
      }

      navigate('/admin/spots');
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
        onClick={() => navigate('/admin/spots')}
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
              ジャンル
            </label>
            <input
              type="text"
              value={formData.genre}
              onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
              placeholder="例: 歴史、自然、グルメ"
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
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Plus Code *
              </label>
              <input
                type="text"
                value={plusCode}
                onChange={(e) => handlePlusCodeInput(e.target.value)}
                placeholder="例: 8Q7XRW6G+QQ"
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {formData.images.map((url, index) => (
              <div key={index} style={{ position: 'relative' }}>
                <img
                  src={url}
                  alt={`Image ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '8px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    padding: '4px 8px',
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasQuiz}
                onChange={(e) => setHasQuiz(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>クイズを設定する</span>
            </label>
          </div>

          {hasQuiz && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  問題文 *
                </label>
                <input
                  type="text"
                  value={formData.quiz.question}
                  onChange={(e) => setFormData({
                    ...formData,
                    quiz: { ...formData.quiz, question: e.target.value }
                  })}
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
                  選択肢（2〜4個）*
                </label>
                {formData.quiz.choices.map((choice, index) => (
                  <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={formData.quiz.correct_answer === index}
                      onChange={() => setFormData({
                        ...formData,
                        quiz: { ...formData.quiz, correct_answer: index }
                      })}
                    />
                    <input
                      type="text"
                      value={choice}
                      onChange={(e) => handleChoiceChange(index, e.target.value)}
                      placeholder={`選択肢 ${index + 1}`}
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                ))}
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                  ラジオボタンで正解を選択してください
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  得点
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.quiz.score}
                  onChange={(e) => setFormData({
                    ...formData,
                    quiz: { ...formData.quiz, score: parseInt(e.target.value) || 1 }
                  })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>
            </>
          )}
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
            onClick={() => navigate('/admin/spots')}
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