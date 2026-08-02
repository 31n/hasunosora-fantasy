import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Spot, User, QuizType } from '../../types';
import { getQuizForUser } from '../../utils/quiz';
import { formatDistance } from '../../utils/distance';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QuizIcon from '@mui/icons-material/Quiz';
import DirectionsIcon from '@mui/icons-material/Directions';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CampaignIcon from '@mui/icons-material/Campaign';
import type { Area } from '../../types';

interface SpotPopupProps {
  spot: Spot;
  distance: number | null;
  onClose: () => void;
  onCheckin: () => void;
  onQuiz: () => void;
  onDirections: () => void;
  isCheckedIn?: boolean;
  isCheckedInToday?: boolean;
  isQuizAvailable?: boolean;
  isInRange?: boolean;
  isOnCooldown?: boolean;
  /** ユーザー情報とクイズタイプ一覧。優先度ベースでクイズを選択するために使用。 */
  user?: User;
  quizTypes?: QuizType[];
  areas?: Area[];
}

export default function SpotPopup({ 
  spot, 
  distance, 
  onClose, 
  onCheckin, 
  onQuiz,
  onDirections,
  isCheckedIn = false,
  isCheckedInToday = false,
  isQuizAvailable = true,
  isInRange = true,
  isOnCooldown = false,
  user,
  quizTypes = [],
  areas = [],
}: SpotPopupProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 優先度ベースでユーザーが利用できるクイズを取得
  const availableQuiz = user
    ? getQuizForUser(spot, user, quizTypes)
    : spot.quizzes?.[0];

  // このスポットが属するキャンペーンエリアを取得
  const today = new Date().toISOString().slice(0, 10);
  const campaignAreas = areas.filter(a =>
    a.area_type === 'campaign' && spot.areas?.includes(a.area_id)
  );

  const closeFullscreen = (idx: number) => {
    setIsFullscreen(false);
    setRotation(0);
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ left: idx * scrollRef.current.offsetWidth, behavior: 'instant' as ScrollBehavior });
      }
    });
  };

  // 経路検索（Googleマップアプリに遷移）
  const handleDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`;
    window.open(url, '_blank');
    onDirections();
  };

  if (!showDetail) {
    // コンパクトビュー
    return (
      <div style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '400px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        animation: 'slideUp 0.3s ease-out'
      }}>
        <div style={{ padding: '16px' }}>
          {/* ヘッダー */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {spot.spot_name}
                {campaignAreas.length > 0 && (
                  <button
                    onClick={() => setShowDetail(true)}
                    title="キャンペーン詳細を見る"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      flexShrink: 0
                    }}
                  >
                    <CampaignIcon fontSize="small" style={{ color: '#d97706' }} />
                  </button>
                )}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                📍 {formatDistance(distance)}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CloseIcon />
            </button>
          </div>

          {/* サムネイル */}
          {spot.images.length > 0 && (
            <div style={{
              width: '100%',
              height: '120px',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '12px'
            }}>
              <img
                src={spot.images[0]}
                alt={spot.spot_name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          )}

          {/* ジャンルタグ */}
          {spot.genre && spot.genre.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {spot.genre.map((g, idx) => (
                <span key={idx} style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* アクションボタン */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* チェックインボタン */}
            <button
              onClick={onCheckin}
              disabled={!isInRange || isCheckedIn}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: !isInRange || isCheckedIn ? '#d1d5db' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: !isInRange || isCheckedIn ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <CheckCircleIcon fontSize="small" />
              {!isInRange ? 'スポットから離れすぎています' : isCheckedIn ? 'チェックイン済み' : isCheckedInToday ? '再チェックイン' : 'チェックイン'}
            </button>

            {/* クイズボタン */}
            {availableQuiz && (
              <button
                onClick={onQuiz}
                disabled={isOnCooldown ? false : (!isInRange || !isQuizAvailable)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: isOnCooldown ? '#f59e0b' : (!isInRange || !isQuizAvailable ? '#d1d5db' : '#f59e0b'),
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: isOnCooldown ? 'pointer' : (!isInRange || !isQuizAvailable ? 'not-allowed' : 'pointer'),
                  fontSize: '15px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <QuizIcon fontSize="small" />
                {!isInRange && !isOnCooldown ? 'スポットから離れすぎています' : isOnCooldown ? 'クイズの詳細を見る' : !isQuizAvailable ? 'クイズ挑戦中...' : `クイズに挑戦（${availableQuiz.score}pt）`}
              </button>
            )}

            {/* 詳細を見るボタン */}
            <button
              onClick={() => setShowDetail(true)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'white',
                color: '#3b82f6',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <InfoIcon fontSize="small" />
              詳細を見る
            </button>


          </div>
        </div>

        <style>{`
          @keyframes slideUp {
            from {
              transform: translateX(-50%) translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateX(-50%) translateY(0);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    );
  }

  // 詳細ビュー（ボトムシート）
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: '80vh',
      backgroundColor: 'white',
      borderTopLeftRadius: '24px',
      borderTopRightRadius: '24px',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
      zIndex: 1000,
      overflowY: 'auto',
      animation: 'slideUpDetail 0.3s ease-out'
    }}>
      {/* ハンドル */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        paddingTop: '12px',
        paddingBottom: '8px'
      }}>
        <div style={{
          width: '40px',
          height: '4px',
          backgroundColor: '#d1d5db',
          borderRadius: '2px'
        }} />
      </div>

      <div style={{ padding: '0 20px 24px 20px' }}>
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>{spot.spot_name}</h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              📍 {formatDistance(distance)}
            </p>
          </div>
          <button
            onClick={() => setShowDetail(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* ジャンルタグ */}
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

        {/* キャンペーンバナー */}
        {campaignAreas.map(area => {
          const isExpired = area.end_date ? area.end_date < today : false;
          const notStarted = area.start_date ? area.start_date > today : false;
          const statusLabel = isExpired ? '終了' : notStarted ? '公開前' : '開催中';
          const statusColor = isExpired ? '#6b7280' : '#d97706';
          return (
            <div key={area.area_id} style={{
              marginBottom: '16px',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: isExpired ? '#f9fafb' : '#fffbeb',
              border: `1px solid ${isExpired ? '#e5e7eb' : '#fde68a'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CampaignIcon fontSize="small" style={{ color: statusColor }} />
                <span style={{ fontWeight: '700', fontSize: '14px', color: statusColor }}>
                  {area.area_name}
                </span>
                <span style={{
                  marginLeft: 'auto',
                  padding: '1px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '700',
                  backgroundColor: isExpired ? '#e5e7eb' : '#fef3c7',
                  color: statusColor
                }}>
                  {statusLabel}
                </span>
              </div>
              {area.description && (
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>
                  {area.description}
                </p>
              )}
              {(area.start_date || area.end_date) && (
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                  期間: {area.start_date ?? '未定'} 〜 {area.end_date ?? '未定'}
                </p>
              )}
              {area.external_url && (
                <a
                  href={area.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                >
                  公式ページを見る <OpenInNewIcon style={{ fontSize: '12px' }} />
                </a>
              )}
            </div>
          );
        })}

        {/* メイン画像 */}
        {spot.images.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            {/* ラッパー: オーバーレイボタンの position 基準 */}
            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
              {/* スクロールコンテナ（画像のみ） */}
              <div
                ref={scrollRef}
                className="carousel-track"
                onScroll={() => {
                  if (!scrollRef.current) return;
                  clearTimeout((scrollRef.current as any)._scrollTimer);
                  (scrollRef.current as any)._scrollTimer = setTimeout(() => {
                    if (!scrollRef.current) return;
                    const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
                    setImageIndex(idx);
                  }, 50);
                }}
                style={{
                  display: 'flex',
                  overflowX: 'auto',
                  scrollSnapType: 'x mandatory',
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  userSelect: 'none',
                }}
              >
                {spot.images.map((src, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: '0 0 100%',
                      scrollSnapAlign: 'start',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={src}
                      alt={`${spot.spot_name} ${idx + 1}`}
                      draggable={false}
                      style={{
                        width: '100%',
                        height: '240px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* オーバーレイ: フルスクリーンボタン */}
              <button
                onClick={() => setIsFullscreen(true)}
                style={{
                  position: 'absolute', bottom: '8px', left: '8px',
                  background: 'rgba(0,0,0,0.45)', color: 'white', border: 'none',
                  borderRadius: '6px', width: '32px', height: '32px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                  zIndex: 1,
                }}
                aria-label="フルスクリーン表示"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                </svg>
              </button>

              {/* オーバーレイ: 左右矢印 + 枚数インジケーター */}
              {spot.images.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      const next = Math.max(imageIndex - 1, 0);
                      scrollRef.current?.scrollTo({ left: next * scrollRef.current.offsetWidth, behavior: 'smooth' });
                      setImageIndex(next);
                    }}
                    disabled={imageIndex === 0}
                    style={{
                      position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none',
                      borderRadius: '50%', width: '36px', height: '36px', fontSize: '18px',
                      cursor: imageIndex === 0 ? 'default' : 'pointer',
                      opacity: imageIndex === 0 ? 0.3 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0,
                      zIndex: 1,
                    }}
                    aria-label="前の画像"
                  >‹</button>
                  <button
                    onClick={() => {
                      const next = Math.min(imageIndex + 1, spot.images.length - 1);
                      scrollRef.current?.scrollTo({ left: next * scrollRef.current.offsetWidth, behavior: 'smooth' });
                      setImageIndex(next);
                    }}
                    disabled={imageIndex === spot.images.length - 1}
                    style={{
                      position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none',
                      borderRadius: '50%', width: '36px', height: '36px', fontSize: '18px',
                      cursor: imageIndex === spot.images.length - 1 ? 'default' : 'pointer',
                      opacity: imageIndex === spot.images.length - 1 ? 0.3 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0,
                      zIndex: 1,
                    }}
                    aria-label="次の画像"
                  >›</button>
                  <div style={{
                    position: 'absolute', bottom: '8px', right: '12px',
                    background: 'rgba(0,0,0,0.5)', color: 'white',
                    borderRadius: '12px', padding: '2px 10px', fontSize: '12px',
                    zIndex: 1, pointerEvents: 'none',
                  }}>
                    {imageIndex + 1} / {spot.images.length}
                  </div>
                </>
              )}
            </div>

            {spot.images.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
                {spot.images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      scrollRef.current?.scrollTo({ left: idx * scrollRef.current.offsetWidth, behavior: 'smooth' });
                      setImageIndex(idx);
                    }}
                    style={{
                      width: idx === imageIndex ? '20px' : '8px', height: '8px',
                      borderRadius: '4px', border: 'none', padding: 0, cursor: 'pointer',
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

        {/* 説明文 */}
        <div style={{
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <p style={{ 
            margin: 0, 
            fontSize: '15px', 
            lineHeight: '1.6',
            color: '#374151',
            whiteSpace: 'pre-wrap'
          }}>
            {spot.description}
          </p>
        </div>

        {/* アクションボタン */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* チェックインボタン */}
          <button
            onClick={onCheckin}
            disabled={!isInRange || isCheckedIn}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: !isInRange || isCheckedIn ? '#d1d5db' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: !isInRange || isCheckedIn ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <CheckCircleIcon fontSize="medium" />
            {!isInRange ? 'スポットから離れすぎています' : isCheckedIn ? 'チェックイン済み' : isCheckedInToday ? '再チェックイン' : 'チェックイン'}
          </button>

          {/* クイズボタン */}
          {availableQuiz && (
            <button
              onClick={onQuiz}
              disabled={isOnCooldown ? false : (!isInRange || !isQuizAvailable)}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: isOnCooldown ? '#f59e0b' : (!isInRange || !isQuizAvailable ? '#d1d5db' : '#f59e0b'),
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: isOnCooldown ? 'pointer' : (!isInRange || !isQuizAvailable ? 'not-allowed' : 'pointer'),
                fontSize: '16px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <QuizIcon fontSize="medium" />
              {!isInRange && !isOnCooldown ? 'スポットから離れすぎています' : isOnCooldown ? 'クイズの詳細を見る' : !isQuizAvailable ? 'クイズ挑戦中...' : `クイズに挑戦（${availableQuiz.score}pt）`}
            </button>
          )}

          {/* 経路検索ボタン */}
          <button
            onClick={handleDirections}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: 'white',
              color: '#3b82f6',
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <DirectionsIcon fontSize="medium" />
            ここへの経路を検索
          </button>

          {/* 外部リンク */}
          {spot.url && (
            <a
              href={spot.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '14px',
                backgroundColor: 'white',
                color: '#6b7280',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                textDecoration: 'none',
                boxSizing: 'border-box'
              }}
            >
              <OpenInNewIcon fontSize="medium" />
              詳細ページを開く
            </a>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUpDetail {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>

      {/* フルスクリーンモーダル */}
      {isFullscreen && createPortal(
        <div
          onClick={() => closeFullscreen(imageIndex)}
          style={{
            position: 'fixed', inset: 0,
            width: '100vw',
            height: '100dvh',
            backgroundColor: 'rgba(0,0,0,0.95)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return;
              const diff = touchStartX.current - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 40) {
                if (diff > 0) setImageIndex((prev) => Math.min(prev + 1, spot.images.length - 1));
                else setImageIndex((prev) => Math.max(prev - 1, 0));
                setRotation(0);
              }
              touchStartX.current = null;
            }}
            style={{ position: 'relative', width: '100vw', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <img
              src={spot.images[imageIndex]}
              alt={`${spot.spot_name} ${imageIndex + 1}`}
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              style={{ width: rotation === 90 || rotation === 270 ? '100dvh' : '100vw', height: rotation === 90 || rotation === 270 ? '100vw' : '100dvh', objectFit: 'contain', cursor: 'pointer', transition: 'transform 0.3s ease', transform: `rotate(${rotation}deg)` }}
            />
            <button
              onClick={() => closeFullscreen(imageIndex)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none',
                borderRadius: '50%', width: '40px', height: '40px', fontSize: '22px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}
              aria-label="閉じる"
            >✕</button>
            {spot.images.length > 1 && (
              <>
                <button
                  onClick={() => { setImageIndex((prev) => Math.max(prev - 1, 0)); setRotation(0); }}
                  disabled={imageIndex === 0}
                  style={{
                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none',
                    borderRadius: '50%', width: '44px', height: '44px', fontSize: '26px',
                    cursor: imageIndex === 0 ? 'default' : 'pointer',
                    opacity: imageIndex === 0 ? 0.3 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0,
                  }}
                  aria-label="前の画像"
                >‹</button>
                <button
                  onClick={() => { setImageIndex((prev) => Math.min(prev + 1, spot.images.length - 1)); setRotation(0); }}
                  disabled={imageIndex === spot.images.length - 1}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none',
                    borderRadius: '50%', width: '44px', height: '44px', fontSize: '26px',
                    cursor: imageIndex === spot.images.length - 1 ? 'default' : 'pointer',
                    opacity: imageIndex === spot.images.length - 1 ? 0.3 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0,
                  }}
                  aria-label="次の画像"
                >›</button>
                <div style={{
                  position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.5)', color: 'white',
                  borderRadius: '12px', padding: '4px 14px', fontSize: '14px',
                }}>
                  {imageIndex + 1} / {spot.images.length}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
