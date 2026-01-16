import { useState } from 'react';
import type { Spot } from '../../types';
import { formatDistance } from '../../utils/distance';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QuizIcon from '@mui/icons-material/Quiz';
import DirectionsIcon from '@mui/icons-material/Directions';

interface SpotPopupProps {
  spot: Spot;
  distance: number;
  onClose: () => void;
  onCheckin: () => void;
  onQuiz: () => void;
  onDirections: () => void;
  isCheckedIn?: boolean;
  isQuizAvailable?: boolean;
}

export default function SpotPopup({ 
  spot, 
  distance, 
  onClose, 
  onCheckin, 
  onQuiz,
  onDirections,
  isCheckedIn = false,
  isQuizAvailable = true
}: SpotPopupProps) {
  const [showDetail, setShowDetail] = useState(false);

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
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{spot.spot_name}</h3>
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
              disabled={isCheckedIn}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: isCheckedIn ? '#d1d5db' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: isCheckedIn ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <CheckCircleIcon fontSize="small" />
              {isCheckedIn ? 'チェックイン済み' : 'チェックイン'}
            </button>

            {/* クイズボタン */}
            {spot.quiz && (
              <button
                onClick={onQuiz}
                disabled={!isQuizAvailable}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: !isQuizAvailable ? '#d1d5db' : '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: !isQuizAvailable ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <QuizIcon fontSize="small" />
                {!isQuizAvailable ? 'クイズ挑戦中...' : `クイズに挑戦（${spot.quiz.score}pt）`}
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

        {/* メイン画像 */}
        {spot.images.length > 0 && (
          <div style={{
            width: '100%',
            height: '240px',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '16px'
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
            disabled={isCheckedIn}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: isCheckedIn ? '#d1d5db' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: isCheckedIn ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <CheckCircleIcon fontSize="medium" />
            {isCheckedIn ? 'チェックイン済み' : 'チェックイン'}
          </button>

          {/* クイズボタン */}
          {spot.quiz && (
            <button
              onClick={onQuiz}
              disabled={!isQuizAvailable}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: !isQuizAvailable ? '#d1d5db' : '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: !isQuizAvailable ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <QuizIcon fontSize="medium" />
              {!isQuizAvailable ? 'クイズ挑戦中...' : `クイズに挑戦（${spot.quiz.score}pt）`}
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
    </div>
  );
}
