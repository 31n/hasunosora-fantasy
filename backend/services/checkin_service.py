from models.user import User
from models.spot import Spot
from models.checkin import CheckIn
from models.cooldown import QuizCooldown
from utils.distance import is_within_range
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
        
        # 訪問履歴チェック
        is_first_visit = not CheckIn.has_visited(user_id, spot_id)
        
        # クールタイムチェック（初回訪問でクイズがある場合のみ）
        if is_first_visit and spot.quiz:
            on_cooldown, cooldown_until = QuizCooldown.is_on_cooldown(user_id, spot_id)
            if on_cooldown:
                raise ValueError('QUIZ_ON_COOLDOWN')
        
        # チェックイン記録を保存（クイズ回答前）
        checkin = CheckIn(
            user_id=user_id,
            spot_id=spot_id,
            quiz_answered=False,
            quiz_correct=False,
            score_earned=0
        )
        checkin.save()
        
        # 初回訪問かつクイズが設定されている場合のみクイズを返す
        if is_first_visit and spot.quiz:
            return {
                'is_first_visit': True,
                'quiz_available': True,
                'quiz': {
                    'question': spot.quiz.get('question'),
                    'choices': spot.quiz.get('choices'),
                    'score': spot.quiz.get('score')
                }
            }
        else:
            # クイズがない、または既に訪問済み
            message = 'チェックイン完了！'
            if not is_first_visit:
                message = 'チェックイン完了！このスポットは訪問済みです。'
            elif not spot.quiz:
                message = 'チェックイン完了！このスポットにはクイズがありません。'
            
            return {
                'is_first_visit': is_first_visit,
                'quiz_available': False,
                'message': message
            }