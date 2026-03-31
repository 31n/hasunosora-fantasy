import type { Spot, User, QuizWithType } from '../types';

/**
 * ユーザーのクイズタイプに合致するクイズを返す。
 * ユーザーの selected_quiz_type と quiz_type_id が完全一致するものだけを返す。
 * 合致するクイズがなければ undefined。
 * （優先度の低い他タイプへのフォールバックは行わない）
 */
export function getQuizForUser(spot: Spot, user: User): QuizWithType | undefined {
  const targetTypeId = user.selected_quiz_type ?? null;
  return spot.quizzes?.find(q => q.quiz_type_id === targetTypeId);
}

/**
 * スポットがユーザーにとってクイズありかどうかを返す。
 * ユーザーのクイズタイプと一致するクイズが存在する場合のみ true。
 */
export function spotHasQuizForUser(spot: Spot, user: User): boolean {
  return getQuizForUser(spot, user) !== undefined;
}
