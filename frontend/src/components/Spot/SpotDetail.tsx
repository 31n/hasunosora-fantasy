import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { indexedDB } from '../../services/indexedDB';
import { userApi, checkinApi } from '../../services/api';
import type { User, Spot, CheckInHistory } from '../../types';

interface SpotDetailProps {
  user: User;
}

export default function SpotDetail({ user }: SpotDetailProps) {
  const { spotId } = useParams<{ spotId: string }>();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [history, setHistory] = useState<CheckInHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const handleBack = () => navigate(from || '/spots');
  const backLabel = from === '/mypage' ? 'マイページに戻る' : '一覧に戻る';

  useEffect(() => {
    loadSpotData();
  }, [spotId]);

  const loadSpotData = async () => {
    if (!spotId) return;

    try {
      // スポット情報を取得
      const spotData = await indexedDB.getSpot(spotId);
      setSpot(spotData || null);

      // ユーザーの全履歴を取得
      const historyData = await userApi.getHistory(user.user_id);
      
      // このスポットの履歴のみフィルター
      const spotHistory = historyData.checkins.filter(
        (h) => h.spot_id === spotId
      );
      setHistory(spotHistory);
    } catch (error) {
      console.error('スポットデータ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    // タイムゾーン情報がない文字列はUTCとして扱う（バックエンドはUTC保存）
    const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(dateString) ? dateString : dateString + 'Z';
    const date = new Date(normalized);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    });
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!spot) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ marginBottom: '16px' }}>スポットが見つかりません</p>
        <button
          onClick={handleBack}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {backLabel}
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100%',
      maxWidth: '1000px',
      padding: '16px',
      margin: '0 auto',
      boxSizing: 'border-box'
    }}>
      <button
        onClick={handleBack}
        style={{
          marginBottom: '16px',
          padding: '8px 16px',
          backgroundColor: 'transparent',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        ← {backLabel}
      </button>

      {/* 画像ギャラリー */}
      {spot.images.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              position: 'relative',
              borderRadius: '12px',
              overflow: 'hidden',
              userSelect: 'none',
            }}
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return;
              const diff = touchStartX.current - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 40) {
                if (diff > 0) {
                  setImageIndex((prev) => Math.min(prev + 1, spot.images.length - 1));
                } else {
                  setImageIndex((prev) => Math.max(prev - 1, 0));
                }
              }
              touchStartX.current = null;
            }}
          >
            <img
              src={spot.images[imageIndex]}
              alt={`${spot.spot_name} ${imageIndex + 1}`}
              onClick={() => setIsFullscreen(true)}
              style={{
                width: '100%',
                height: '300px',
                objectFit: 'cover',
                display: 'block',
                cursor: 'zoom-in',
              }}
            />

            {/* フルスクリーンボタン */}
            <button
              onClick={() => setIsFullscreen(true)}
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                background: 'rgba(0,0,0,0.45)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
              aria-label="フルスクリーン表示"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
              </svg>
            </button>

            {/* 左右矢印ボタン（複数画像のとき） */}
            {spot.images.length > 1 && (
              <>
                <button
                  onClick={() => setImageIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={imageIndex === 0}
                  style={{
                    position: 'absolute',
                    left: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.4)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    fontSize: '18px',
                    cursor: imageIndex === 0 ? 'default' : 'pointer',
                    opacity: imageIndex === 0 ? 0.3 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                  aria-label="前の画像"
                >
                  ‹
                </button>
                <button
                  onClick={() => setImageIndex((prev) => Math.min(prev + 1, spot.images.length - 1))}
                  disabled={imageIndex === spot.images.length - 1}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.4)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    fontSize: '18px',
                    cursor: imageIndex === spot.images.length - 1 ? 'default' : 'pointer',
                    opacity: imageIndex === spot.images.length - 1 ? 0.3 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                  aria-label="次の画像"
                >
                  ›
                </button>

                {/* 枚数インジケーター */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '12px',
                    background: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '2px 10px',
                    fontSize: '12px',
                  }}
                >
                  {imageIndex + 1} / {spot.images.length}
                </div>
              </>
            )}
          </div>

          {/* ドットナビゲーション（複数画像のとき） */}
          {spot.images.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
              {spot.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setImageIndex(idx)}
                  style={{
                    width: idx === imageIndex ? '20px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    backgroundColor: idx === imageIndex ? '#3b82f6' : '#d1d5db',
                    transition: 'width 0.2s, background-color 0.2s',
                  }}
                  aria-label={`画像 ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* スポット情報 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ marginBottom: '12px' }}>{spot.spot_name}</h1>
        
        {spot.genre && spot.genre.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {spot.genre.map((g, idx) => (
              <span key={idx} style={{
                display: 'inline-block',
                padding: '6px 16px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {g}
              </span>
            ))}
          </div>
        )}
        
        <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '16px' }}>
          {spot.description}
        </p>

        {/* スポット詳細 */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: spot.quiz ? 'repeat(2, 1fr)' : '1fr',
          gap: '12px',
          marginTop: '16px',
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px'
        }}>
          <div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              検知距離
            </p>
            <p style={{ fontWeight: '600' }}>{spot.detection_radius}m</p>
          </div>
          {spot.quiz ? (
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                クイズ得点
              </p>
              <p style={{ fontWeight: '600' }}>{spot.quiz.score}点</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                クイズ
              </p>
              <p style={{ fontWeight: '600', color: '#9ca3af' }}>なし</p>
            </div>
          )}
        </div>

        {/* 地図で表示ボタン */}
        <button
          onClick={() => navigate(`/?spotId=${spot.spot_id}`)}
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          地図で表示
        </button>
      </div>

      {/* 訪問履歴 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ marginBottom: '16px', fontSize: '20px' }}>訪問履歴</h2>
        
        {history.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '24px 0' }}>
            まだ訪問していません
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <p style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {formatDate(item.checked_in_at)}
                  </p>
                  {item.quiz_answered ? (
                    <p style={{ 
                      fontSize: '14px',
                      color: item.quiz_correct ? '#059669' : '#dc2626'
                    }}>
                      {item.quiz_correct ? '✓ 正解' : '✗ 不正解'}
                      {item.quiz_correct && ` (+${item.score_earned}点)`}
                    </p>
                  ) : (
                    <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                      クイズ未回答
                    </p>
                  )}
                </div>
                <span style={{
                  padding: '4px 12px',
                  backgroundColor: item.quiz_correct ? '#d1fae5' : '#fee2e2',
                  color: item.quiz_correct ? '#065f46' : '#991b1b',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {index === 0 ? '最新' : `${index + 1}回目`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* フルスクリーンモーダル */}
      {isFullscreen && (
        <div
          onClick={() => setIsFullscreen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100dvh',
            backgroundColor: 'rgba(0,0,0,0.95)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return;
              const diff = touchStartX.current - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 40) {
                if (diff > 0) {
                  setImageIndex((prev) => Math.min(prev + 1, spot.images.length - 1));
                } else {
                  setImageIndex((prev) => Math.max(prev - 1, 0));
                }
              }
              touchStartX.current = null;
            }}
            style={{
              position: 'relative',
              width: '100vw',
              height: '100dvh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={spot.images[imageIndex]}
              alt={`${spot.spot_name} ${imageIndex + 1}`}
              style={{
                maxWidth: '100vw',
                maxHeight: '100dvh',
                objectFit: 'contain',
              }}
            />

            {/* 閉じるボタン */}
            <button
              onClick={() => setIsFullscreen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                fontSize: '22px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
              aria-label="閉じる"
            >
              ✕
            </button>

            {/* 矢印 & カウンター */}
            {spot.images.length > 1 && (
              <>
                <button
                  onClick={() => setImageIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={imageIndex === 0}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    fontSize: '26px',
                    cursor: imageIndex === 0 ? 'default' : 'pointer',
                    opacity: imageIndex === 0 ? 0.3 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                  aria-label="前の画像"
                >
                  ‹
                </button>
                <button
                  onClick={() => setImageIndex((prev) => Math.min(prev + 1, spot.images.length - 1))}
                  disabled={imageIndex === spot.images.length - 1}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    fontSize: '26px',
                    cursor: imageIndex === spot.images.length - 1 ? 'default' : 'pointer',
                    opacity: imageIndex === spot.images.length - 1 ? 0.3 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                  aria-label="次の画像"
                >
                  ›
                </button>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '4px 14px',
                    fontSize: '14px',
                  }}
                >
                  {imageIndex + 1} / {spot.images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}