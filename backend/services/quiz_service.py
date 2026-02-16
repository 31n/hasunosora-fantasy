from datetime import datetime
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
        
        # 既に回答済みかチェック（初回チェックイン時のみクイズ可能）
        if CheckIn.has_answered_quiz(user_id, spot_id):
            raise ValueError('QUIZ_ALREADY_ANSWERED')
        
        # クールタイムチェック（不正解後の再挑戦制限）
        on_cooldown, cooldown_until = QuizCooldown.is_on_cooldown(user_id, spot_id)
        if on_cooldown:
            raise ValueError('QUIZ_ON_COOLDOWN')
        
        # 正解判定
        correct_answer = spot.quiz.get('correct_answer')
        is_correct = (answer == correct_answer)
        
        # 正解の場合
        if is_correct:
            score = spot.quiz.get('score', 0)
            
            # 得点を加算
            user.add_score(score)
            
            # チェックイン記録を更新
            # 最新のチェックイン記録を更新する必要があるが、
            # DynamoDBの制約上、新しいレコードとして保存
            checkin = CheckIn(
                user_id=user_id,
                spot_id=spot_id,
                quiz_answered=True,
                quiz_correct=True,
                score_earned=score
            )
            checkin.save()
            
            return {
                'correct': True,
                'score_earned': score,
                'total_score': user.total_score,
                'message': '正解です！'
            }
        
        # 不正解の場合
        else:
            # 不正解時のポイント（正解時の1/4を切り上げ）
            score = spot.quiz.get('score', 0)
            incorrect_score = math.ceil(score / 4)
            
            # 得点を加算
            user.add_score(incorrect_score)
            
            # クールタイムを設定
            cooldown = QuizCooldown(user_id=user_id, spot_id=spot_id)
            cooldown.save()
            
            # チェックイン記録を更新
            checkin = CheckIn(
                user_id=user_id,
                spot_id=spot_id,
                quiz_answered=True,
                quiz_correct=False,
                score_earned=incorrect_score
            )
            checkin.save()
            
            return {
                'correct': False,
                'score_earned': incorrect_score,
                'total_score': user.total_score,
                'cooldown_until': cooldown.cooldown_until,
                'message': f'不正解です。{config.QUIZ_COOLDOWN_MINUTES}分後に再挑戦できます。'
            }
    
    @staticmethod
    def check_cooldown(user_id: str, spot_id: str) -> Dict:
        """クールタイム状態を確認"""
        on_cooldown, cooldown_until = QuizCooldown.is_on_cooldown(user_id, spot_id)
        
        if on_cooldown:
            # 残り時間を計算
            cooldown_dt = datetime.fromisoformat(cooldown_until.replace('Z', '+00:00'))
            now = datetime.utcnow()
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
