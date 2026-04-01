import { useState } from 'react';
import { checkinApi } from '../../services/api';
import type { User, Spot, CheckInResponse, QuizType } from '../../types';
import CelebrationIcon from '@mui/icons-material/Celebration';
import CloseIcon from '@mui/icons-material/Close';

interface QuizModalProps {
  user: User;
  spot: Spot;
  quizData: CheckInResponse;
  onClose: () => void;
  readOnly?: boolean;
  quizTypeId?: string | null;
  quizTypes?: QuizType[];
}

export default function QuizModal({ user, spot, quizData, onClose, readOnly = false, quizTypeId, quizTypes = [] }: QuizModalProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    message: string;
    score_earned: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);

  const correctAnswerIndex =
    (quizData.quiz as any)?.correct_answer ??
    spot.quizzes?.find(q => q.quiz_type_id === (quizTypeId ?? null))?.correct_answer ??
    spot.quizzes?.find(q => q.quiz_type_id === null)?.correct_answer ??
    spot.quizzes?.[0]?.correct_answer ??
    null;
  const correctAnswerText =
    correctAnswerIndex !== null && quizData.quiz?.choices
      ? quizData.quiz.choices[correctAnswerIndex]
      : null;

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
        selectedAnswer,
        quizTypeId ?? undefined
      );

      setResult({
        correct: response.correct,
        message: response.message,
        score_earned: response.score_earned,
      });
    } catch (error: any) {
      if (error.message.includes('QUIZ_NOT_AVAILABLE')) {
        alert('このスポットにはクイズが登録されていません。');
      } else {
        alert('エラーが発生しました。しばらく時間をおいてから再試行してください。');
      }
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
        <h2 style={{ marginBottom: '8px' }}>{spot.spot_name}</h2>

        {(() => {
          const quizTypeName = quizTypeId != null
            ? quizTypes.find(t => t.quiz_type_id === quizTypeId)?.name
            : null;
          return (
            <div style={{ marginBottom: '16px' }}>
              <span style={{
                display: 'inline-block',
                padding: '2px 10px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: '600',
                backgroundColor: quizTypeName ? '#dbeafe' : '#f3f4f6',
                color: quizTypeName ? '#1d4ed8' : '#6b7280',
              }}>
                {quizTypeName ?? 'デフォルト'}
              </span>
            </div>
          );
        })()}

        {!result ? (
          <>
            {readOnly && (
              <div style={{
                marginBottom: '16px',
                padding: '12px 16px',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#92400e',
                fontWeight: '600'
              }}>
                📅 本日は回答済みです。明日また挑戦できます。
              </div>
            )}

            <p style={{ fontSize: '18px', marginBottom: quizData.quiz?.question_image ? '12px' : '24px', fontWeight: 'bold' }}>
              {quizData.quiz?.question}
            </p>

            {quizData.quiz?.question_image && (
              <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <img
                  src={quizData.quiz.question_image}
                  alt="問題画像"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '240px',
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              {quizData.quiz?.choices.map((choice, index) => (
                <label
                  key={index}
                  style={{
                    display: 'block',
                    padding: '12px',
                    marginBottom: '8px',
                    border: `2px solid ${showCorrectAnswer && index === correctAnswerIndex ? '#16a34a' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    cursor: readOnly ? 'default' : 'pointer',
                    backgroundColor:
                      showCorrectAnswer && index === correctAnswerIndex
                        ? '#dcfce7'
                        : !readOnly && selectedAnswer === index
                        ? '#dbeafe'
                        : 'white',
                    opacity: readOnly && !(showCorrectAnswer && index === correctAnswerIndex) ? 0.7 : 1,
                    fontWeight: showCorrectAnswer && index === correctAnswerIndex ? 'bold' : 'normal',
                  }}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={index}
                    checked={!readOnly && selectedAnswer === index}
                    onChange={() => !readOnly && setSelectedAnswer(index)}
                    disabled={readOnly}
                    style={{ marginRight: '8px' }}
                  />
                  {choice}
                  {showCorrectAnswer && index === correctAnswerIndex && (
                    <span style={{ marginLeft: '8px', color: '#16a34a' }}>✓ 正解</span>
                  )}
                </label>
              ))}
            </div>

            {readOnly && (
              <div style={{ marginBottom: '16px' }}>
                <button
                  onClick={() => setShowCorrectAnswer(!showCorrectAnswer)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: showCorrectAnswer ? '#f3f4f6' : '#fef9c3',
                    color: '#374151',
                    border: '2px solid #fbbf24',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  {showCorrectAnswer ? '正解を非表示にする' : '正解を表示する'}
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              {!readOnly && (
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
              )}
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: readOnly ? '#3b82f6' : '#e5e7eb',
                  color: readOnly ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                閉じる
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
              <p style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {result.correct ? (
                  <><CelebrationIcon style={{ fontSize: '28px' }} /> 正解！</>
                ) : (
                  <><CloseIcon style={{ fontSize: '28px' }} /> 不正解</>
                )}
              </p>
              <p style={{ fontSize: '16px' }}>{result.message}</p>
              {result.score_earned > 0 && (
                <p style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '12px' }}>
                  +{result.score_earned}点
                </p>
              )}
            </div>

            {!result.correct && correctAnswerText && (
              <div style={{ marginBottom: '16px' }}>
                <button
                  onClick={() => setShowCorrectAnswer(!showCorrectAnswer)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: showCorrectAnswer ? '#f3f4f6' : '#fef9c3',
                    color: '#374151',
                    border: '2px solid #fbbf24',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginBottom: showCorrectAnswer ? '8px' : '0',
                  }}
                >
                  {showCorrectAnswer ? '正解を非表示にする' : '正解を表示する'}
                </button>
                {showCorrectAnswer && (
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#dcfce7',
                    border: '2px solid #16a34a',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    color: '#15803d',
                  }}>
                    ✓ 正解：{correctAnswerText}
                  </div>
                )}
              </div>
            )}

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
