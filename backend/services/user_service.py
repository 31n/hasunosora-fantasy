from models.user import User
from models.checkin import CheckIn
from models.spot import Spot
from utils.user_id_generator import generate_user_id
from typing import Dict, List

class UserService:
    @staticmethod
    def create_user() -> Dict:
        """新規ユーザーを作成"""
        user_id = generate_user_id()
        
        # ユーザーIDの重複チェック（念のため）
        while User.get(user_id) is not None:
            user_id = generate_user_id()
        
        user = User(user_id=user_id)
        user.save()
        
        return user.to_dict()
    
    @staticmethod
    def login(user_id: str) -> Dict:
        """ユーザーログイン"""
        user = User.get(user_id)
        
        if not user:
            raise ValueError('USER_NOT_FOUND')
        
        return user.to_dict()
    
    @staticmethod
    def set_nickname(user_id: str, nickname: str) -> Dict:
        """ニックネームを設定"""
        user = User.get(user_id)
        
        if not user:
            raise ValueError('USER_NOT_FOUND')
        
        if user.nickname:
            raise ValueError('NICKNAME_ALREADY_SET')
        
        user.update_nickname(nickname)
        
        return user.to_dict()
    
    @staticmethod
    def get_history(user_id: str, limit: int = 50, offset: int = 0) -> Dict:
        """ユーザーの訪問履歴を取得"""
        user = User.get(user_id)
        
        if not user:
            raise ValueError('USER_NOT_FOUND')
        
        # 全チェックイン履歴を取得（統計計算用）
        all_checkins = CheckIn.get_user_history(user_id, limit=1000, offset=0)
        
        # 統計情報を計算
        unique_spots = set()
        total_visits = len(all_checkins)
        total_correct = 0
        
        for item in all_checkins:
            unique_spots.add(item['spot_id'])
            if item.get('quiz_correct', False):
                total_correct += 1
        
        # 指定範囲のチェックイン履歴を取得
        checkins_raw = CheckIn.get_user_history(user_id, limit, offset)
        
        # スポット情報を付加
        checkins = []
        for item in checkins_raw:
            spot = Spot.get(item['spot_id'])
            checkins.append({
                'spot_id': item['spot_id'],
                'spot_name': spot.spot_name if spot else 'Unknown',
                'checked_in_at': item['checked_in_at'],
                'quiz_answered': item.get('quiz_answered', False),
                'quiz_correct': item.get('quiz_correct', False),
                'score_earned': item.get('score_earned', 0)
            })
        
        return {
            'user_id': user_id,
            'unique_spots_count': len(unique_spots),
            'total_visits': total_visits,
            'total_correct': total_correct,
            'total_count': len(checkins),
            'checkins': checkins
        }
