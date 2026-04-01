import type { Spot, User, QuizType, QuizWithType } from '../types';

/**
 * quiz_type_id に対応する display_order を返す。
 * null（デフォルト）タイプは 0 として扱う。
 */
function getOrderForTypeId(
  typeId: string | null,
  quizTypes: QuizType[]
): number {
  if (typeId === null) return 0;
  return quizTypes.find(t => t.quiz_type_id === typeId)?.display_order ?? 0;
}

/**
 * ユーザーが利用できる最適なクイズを返す。
 *
 * ルール:
 *   1. ユーザーの selected_quiz_type の display_order（= userOrder）を取得。
 *      selected_quiz_type が null（デフォルト）ならば userOrder = 0。
 *   2. スポットのクイズを quiz_type_id の display_order でフィルタリングし、
 *      display_order <= userOrder のものだけを対象とする。
 *   3. 対象の中で display_order が最大（ユーザーに最も近いレベル）のクイズを返す。
 *   4. 対象クイズがなければ undefined（= クイズなしスポット扱い）。
 */
export function getQuizForUser(
  spot: Spot,
  user: User,
  quizTypes: QuizType[]
): QuizWithType | undefined {
  if (!spot.quizzes?.length) return undefined;

  const userOrder = getOrderForTypeId(user.selected_quiz_type ?? null, quizTypes);

  const candidates = spot.quizzes.filter(
    q => getOrderForTypeId(q.quiz_type_id, quizTypes) <= userOrder
  );

  if (!candidates.length) return undefined;

  // display_order が最大のものを選ぶ（ユーザーに最も近いレベル）
  return candidates.reduce((best, q) =>
    getOrderForTypeId(q.quiz_type_id, quizTypes) >
    getOrderForTypeId(best.quiz_type_id, quizTypes)
      ? q
      : best
  );
}

/**
 * スポットがユーザーにとってクイズありかどうかを返す。
 */
export function spotHasQuizForUser(
  spot: Spot,
  user: User,
  quizTypes: QuizType[]
): boolean {
  return getQuizForUser(spot, user, quizTypes) !== undefined;
}
