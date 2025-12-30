import { useState } from 'react';
import { checkinApi } from '../../services/api';
import type { User, Spot, CheckInResponse } from '../../types';

interface QuizModalProps {
  user: User;
  spot: Spot;
  quizData: CheckInResponse;
  onClose: () => void;
}

export default function QuizModal({ user, spot, quizData, onClose }: QuizModalProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    message: string;
    score_earned: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (selectedAnswer === null) {
      alert('選択肢を選んでください');
      return;
    }

    setSubmitting(true);

    try {
      const response = await checkinApi.answerQuiz(
        user.user_id,
        spot.spot_id,
        selectedAnswer
      );

      setResult({
        correct: response.correct,
        message: response.message,
        score_earned: response.score_earned,
      });
    } catch (error: any) {
      alert('エラーが発生しました: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <h2 style={{ marginBottom: '16px' }}>{spot.spot_name}</h2>

        {!result ? (
          <>
            <p style={{ fontSize: '18px', marginBottom: '24px', fontWeight: 'bold' }}>
              {quizData.quiz?.question}
            </p>

            <div style={{ marginBottom: '24px' }}>
              {quizData.quiz?.choices.map((choice, index) => (
                <label
                  key={index}
                  style={{
                    display: 'block',
                    padding: '12px',
                    marginBottom: '8px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: selectedAnswer === index ? '#dbeafe' : 'white',
                  }}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={index}
                    checked={selectedAnswer === index}
                    onChange={() => setSelectedAnswer(index)}
                    style={{ marginRight: '8px' }}
                  />
                  {choice}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSubmit}
                disabled={submitting || selectedAnswer === null}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                {submitting ? '送信中...' : '回答する'}
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                textAlign: 'center',
                padding: '24px',
                backgroundColor: result.correct ? '#dcfce7' : '#fee2e2',
                borderRadius: '8px',
                marginBottom: '24px',
              }}
            >
              <p style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                {result.correct ? '🎉 正解！' : '❌ 不正解'}
              </p>
              <p style={{ fontSize: '16px' }}>{result.message}</p>
              {result.correct && (
                <p style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '12px' }}>
                  +{result.score_earned}点
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              閉じる
            </button>
          </>
        )}
      </div>
    </div>
  );
}
