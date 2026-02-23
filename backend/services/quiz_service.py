from datetime import datetime, timezone
import math
from models.user import User
from models.spot import Spot
from models.checkin import CheckIn
from models.cooldown import QuizCooldown
from config import config
from typing import Dict

class QuizService:
    @staticmethod
    def answer_quiz(user_id: str, spot_id: str, answer: int) -> Dict:
        """クイズ回答処理"""
        # ユーザーとスポットの存在確認
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

        # 正解判定
        correct_answer = spot.quiz.get('correct_answer')
        is_correct = (answer == correct_answer)

        # 正解の場合
        if is_correct:
            score = spot.quiz.get('score', 0)

            user.add_score(score)

            checkin = CheckIn(
                user_id=user_id,
                spot_id=spot_id,
                quiz_answered=True,
                quiz_correct=True,
                score_earned=score
            )
            checkin.save()

            # クイズ回答済み（翌日JST 0時まで）を記録
            cooldown = QuizCooldown(user_id=user_id, spot_id=spot_id)
            cooldown.save()

            return {
                'correct': True,
                'score_earned': score,
                'total_score': user.total_score,
                'cooldown_until': cooldown.cooldown_until,
                'message': '正解です！'
            }

        # 不正解の場合
        else:
            score = spot.quiz.get('score', 0)
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

            # クイズ回答済み（翌日JST 0時まで）を記録
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