import { useState, useEffect } from 'react';
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
    const date = new Date(dateString);
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
        <div style={{ 
          marginBottom: '24px',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <img
            src={spot.images[0]}
            alt={spot.spot_name}
            style={{
              width: '100%',
              height: '300px',
              objectFit: 'cover'
            }}
          />
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
    </div>
  );
}