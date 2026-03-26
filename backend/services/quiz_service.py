from datetime import datetime, timezone
import math
from models.user import User
from models.spot import Spot
from models.checkin import CheckIn
from models.cooldown import QuizCooldown
from models.quiz_type import QuizType
from utils.distance import is_within_range
from config import config
from typing import Dict, Optional, Set

class QuizService:
    @staticmethod
    def _get_allowed_quiz_type_ids(selected_quiz_type: Optional[str]) -> Optional[Set[str]]:
        """
        ユーザーの selected_quiz_type の display_order 以下の
        クイズタイプIDセットを返す。
        selected_quiz_type が None の場合は制限なし（None を返す）。
        """
        if selected_quiz_type is None:
            return None  # 制限なし

        all_types = QuizType.get_all(include_inactive=True)
        user_type = next(
            (t for t in all_types if t.quiz_type_id == selected_quiz_type), None
        )
        if not user_type:
            return None  # タイプが見つからない場合は制限なし

        max_order = user_type.display_order
        return {t.quiz_type_id for t in all_types if t.display_order <= max_order}

    @staticmethod
    def answer_quiz(user_id: str, spot_id: str, answer: int,
                    quiz_type_id: Optional[str] = None) -> Dict:
        """クイズ回答処理"""
        user = User.get(user_id)
        if not user:
            raise ValueError('USER_NOT_FOUND')

        spot = Spot.get(spot_id)
        if not spot:
            raise ValueError('SPOT_NOT_FOUND')

        # 当日（JST）回答済みかチェック
        on_cooldown, cooldown_until = QuizCooldown.is_on_cooldown(user_id, spot_id)
        if on_cooldown:
            raise ValueError('QUIZ_ALREADY_ANSWERED_TODAY')

        # クライアントから渡された quiz_type_id でクイズを特定。
        # 渡されない場合はユーザーの selected_quiz_type を使用。
        effective_type = quiz_type_id if quiz_type_id is not None else user.selected_quiz_type
        allowed_ids = QuizService._get_allowed_quiz_type_ids(user.selected_quiz_type)
        quiz = spot.get_quiz_for_type(effective_type, allowed_quiz_type_ids=allowed_ids)
        if not quiz:
            raise ValueError('QUIZ_NOT_AVAILABLE')

        # 正解判定
        correct_answer = quiz.get('correct_answer')
        is_correct = (answer == correct_answer)

        if is_correct:
            score = quiz.get('score', 0)
            user.add_score(score)

            checkin = CheckIn(
                user_id=user_id,
                spot_id=spot_id,
                quiz_answered=True,
                quiz_correct=True,
                score_earned=score
            )
            checkin.save()

            cooldown = QuizCooldown(user_id=user_id, spot_id=spot_id)
            cooldown.save()

            return {
                'correct': True,
                'score_earned': score,
                'total_score': user.total_score,
                'cooldown_until': cooldown.cooldown_until,
                'message': '正解です！'
            }
        else:
            score = quiz.get('score', 0)
            incorrect_score = math.ceil(score / 4)
            user.add_score(incorrect_score)

            checkin = CheckIn(
                user_id=user_id,
                spot_id=spot_id,
                quiz_answered=True,
                quiz_correct=False,
                score_earned=incorrect_score
            )
            checkin.save()

            cooldown = QuizCooldown(user_id=user_id, spot_id=spot_id)
            cooldown.save()

            return {
                'correct': False,
                'score_earned': incorrect_score,
                'total_score': user.total_score,
                'cooldown_until': cooldown.cooldown_until,
                'message': '不正解です。明日また挑戦できます。'
            }

    @staticmethod
    def quiz_challenge(user_id: str, spot_id: str, latitude: float, longitude: float) -> Dict:
        """
        クイズ挑戦処理（チェックインと独立したエンドポイント）

        - ユーザーの selected_quiz_type に対応するクイズを返す
        - 該当タイプがなければデフォルト（quiz_type_id=None）を返す
        - チェックインクールタイム中でもクイズを返す
        - 当日クイズ回答済みなら QUIZ_ALREADY_ANSWERED_TODAY エラー
        """
        user = User.get(user_id)
        if not user:
            raise ValueError('USER_NOT_FOUND')

        spot = Spot.get(spot_id)
        if not spot:
            raise ValueError('SPOT_NOT_FOUND')

        # ユーザーの selected_quiz_type に対応するクイズを取得
        # display_order がユーザー設定を超えるクイズタイプは除外する
        allowed_ids = QuizService._get_allowed_quiz_type_ids(user.selected_quiz_type)
        quiz = spot.get_quiz_for_type(user.selected_quiz_type, allowed_quiz_type_ids=allowed_ids)
        if not quiz:
            raise ValueError('QUIZ_NOT_AVAILABLE')

        # 距離チェック
        if not is_within_range(latitude, longitude,
                               spot.latitude, spot.longitude,
                               spot.detection_radius):
            raise ValueError('OUT_OF_RANGE')

        # 当日クイズ回答済みチェック
        on_cooldown, cooldown_until = QuizCooldown.is_on_cooldown(user_id, spot_id)
        if on_cooldown:
            raise ValueError('QUIZ_ALREADY_ANSWERED_TODAY')

        # チェックインクールタイム外かつ当日未スコアであればチェックイン記録も付与
        checkin_score = 0
        if not CheckIn.is_within_cooldown(user_id, spot_id):
            already_scored_today = CheckIn.has_checkin_today(user_id, spot_id)
            if not already_scored_today:
                checkin_score = config.CHECKIN_SCORE
                user.add_score(checkin_score)

            checkin = CheckIn(
                user_id=user_id,
                spot_id=spot_id,
                quiz_answered=False,
                quiz_correct=False,
                score_earned=checkin_score
            )
            checkin.save()

        return {
            'checkin_score_earned': checkin_score,
            'total_score': user.total_score,
            'quiz_available': True,
            'quiz_type_id': quiz.get('quiz_type_id'),
            'quiz': {
                'question': quiz.get('question'),
                'choices': quiz.get('choices'),
                'score': quiz.get('score')
            }
        }

    @staticmethod
    def check_cooldown(user_id: str, spot_id: str) -> Dict:
        """クイズ回答済み状態を確認"""
        on_cooldown, cooldown_until = QuizCooldown.is_on_cooldown(user_id, spot_id)

        if on_cooldown:
            cooldown_dt = datetime.fromisoformat(cooldown_until.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            remaining_seconds = int((cooldown_dt - now).total_seconds())

            return {
                'on_cooldown': True,
                'cooldown_until': cooldown_until,
                'remaining_seconds': max(0, remaining_seconds)
            }
        else:
            return {
                'on_cooldown': False
            }