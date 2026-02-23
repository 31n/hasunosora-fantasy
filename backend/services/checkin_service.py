from models.user import User
from models.spot import Spot
from models.checkin import CheckIn
from utils.distance import is_within_range
from config import config
from typing import Dict

class CheckInService:
    @staticmethod
    def checkin(user_id: str, spot_id: str, latitude: float, longitude: float) -> Dict:
        """チェックイン処理"""
        # ユーザーとスポットの存在確認
        user = User.get(user_id)
        if not user:
            raise ValueError('USER_NOT_FOUND')

        spot = Spot.get(spot_id)
        if not spot:
            raise ValueError('SPOT_NOT_FOUND')

        # 距離チェック
        if not is_within_range(latitude, longitude,
                               spot.latitude, spot.longitude,
                               spot.detection_radius):
            raise ValueError('OUT_OF_RANGE')

        # クールタイムチェック（5分以内の同スポット再チェックインを防ぐ）
        if CheckIn.is_within_cooldown(user_id, spot_id):
            raise ValueError('CHECKIN_ON_COOLDOWN')

        # 当日（JST）ポイント付与済みか確認
        already_scored_today = CheckIn.has_checkin_today(user_id, spot_id)

        # ポイント付与
        score_earned = 0
        if not already_scored_today:
            score_earned = config.CHECKIN_SCORE
            user.add_score(score_earned)

        # チェックイン記録を保存
        checkin = CheckIn(
            user_id=user_id,
            spot_id=spot_id,
            quiz_answered=False,
            quiz_correct=False,
            score_earned=score_earned
        )
        checkin.save()

        # クイズの提示判定（当日未回答かつクイズが設定されている場合）
        from models.cooldown import QuizCooldown
        quiz_answered_today, _ = QuizCooldown.is_on_cooldown(user_id, spot_id)

        if spot.quiz and not quiz_answered_today:
            return {
                'score_earned': score_earned,
                'total_score': user.total_score,
                'already_scored_today': already_scored_today,
                'quiz_available': True,
                'quiz': {
                    'question': spot.quiz.get('question'),
                    'choices': spot.quiz.get('choices'),
                    'score': spot.quiz.get('score')
                }
            }
        else:
            return {
                'score_earned': score_earned,
                'total_score': user.total_score,
                'already_scored_today': already_scored_today,
                'quiz_available': False
            }