from models.user import User
from models.spot import Spot
from models.checkin import CheckIn
from utils.distance import is_within_range
from config import config
from datetime import datetime, timedelta, timezone
from typing import Dict

JST = timezone(timedelta(hours=9))


def _parse_utc(value: str) -> datetime:
    """保存されている日時文字列を UTC の datetime にする（タイムゾーンなしは UTC とみなす）"""
    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

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

        quiz = spot.get_quiz_for_type(user.selected_quiz_type)
        if quiz and not quiz_answered_today:
            return {
                'score_earned': score_earned,
                'total_score': user.total_score,
                'already_scored_today': already_scored_today,
                'quiz_available': True,
                'quiz': {
                    'question': quiz.get('question'),
                    'choices': quiz.get('choices'),
                    'score': quiz.get('score')
                }
            }
        else:
            return {
                'score_earned': score_earned,
                'total_score': user.total_score,
                'already_scored_today': already_scored_today,
                'quiz_available': False
            }

    @staticmethod
    def get_spot_status(user_id: str, spot_id: str) -> Dict:
        """スポットを開いたときに必要な、チェックインとクイズの状態をまとめて返す"""
        from models.cooldown import QuizCooldown

        now = datetime.now(timezone.utc)
        last_checked_in_at = CheckIn.get_latest_checked_in_at(user_id, spot_id)

        checkin_cooldown_until = None
        checked_in_today = False
        if last_checked_in_at:
            last = _parse_utc(last_checked_in_at)
            until = last + timedelta(minutes=config.CHECKIN_COOLDOWN_MINUTES)
            if until > now:
                checkin_cooldown_until = until.isoformat()
            checked_in_today = last.astimezone(JST).date() == now.astimezone(JST).date()

        quiz_on_cooldown, quiz_cooldown_until = QuizCooldown.is_on_cooldown(user_id, spot_id)

        return {
            'spot_id': spot_id,
            'last_checked_in_at': last_checked_in_at,
            # この時刻まではチェックインできない（クールタイム中でなければ None）
            'checkin_cooldown_until': checkin_cooldown_until,
            'checked_in_today': checked_in_today,
            'quiz_on_cooldown': quiz_on_cooldown,
            'quiz_cooldown_until': quiz_cooldown_until,
        }

    @staticmethod
    def get_checked_in_spots(user_id: str) -> Dict:
        """チェックインしたことのあるスポットと、それぞれの最後のチェックイン日時"""
        latest = CheckIn.get_latest_checked_in_at_by_spot(user_id)
        return {
            'spots': [
                {'spot_id': spot_id, 'last_checked_in_at': checked_in_at}
                for spot_id, checked_in_at in latest.items()
            ]
        }
