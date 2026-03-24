from models.user import User
from models.checkin import CheckIn
from models.spot import Spot
from models.area import Area
from models.quiz_type import QuizType
from utils.user_id_generator import generate_user_id
from typing import Dict, List, Optional

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
    def set_selected_area(user_id: str, selected_area: Optional[str]) -> Dict:
        """選択中のエリアを設定"""
        user = User.get(user_id)
        
        if not user:
            raise ValueError('USER_NOT_FOUND')
        
        # エリアIDが指定されている場合は存在チェック
        if selected_area is not None and selected_area != '':
            area = Area.get(selected_area)
            if not area:
                raise ValueError('AREA_NOT_FOUND')
            if not area.is_active:
                raise ValueError('AREA_INACTIVE')
        
        user.update_selected_area(selected_area)
        
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
    
    @staticmethod
    def set_selected_quiz_type(user_id: str, selected_quiz_type: Optional[str]) -> Dict:
        """選択中のクイズタイプを設定"""
        user = User.get(user_id)

        if not user:
            raise ValueError('USER_NOT_FOUND')

        # クイズタイプIDが指定されている場合は存在チェック
        if selected_quiz_type is not None and selected_quiz_type != '':
            qt = QuizType.get(selected_quiz_type)
            if not qt:
                raise ValueError('QUIZ_TYPE_NOT_FOUND')
            if not qt.is_active:
                raise ValueError('QUIZ_TYPE_INACTIVE')

        user.update_selected_quiz_type(selected_quiz_type or None)

        return user.to_dict()

    @staticmethod
    def unlock_area(user_id: str, area_code: str) -> Dict:
        """エリアコードを検証してエリアを解放"""
        user = User.get(user_id)
        
        if not user:
            raise ValueError('USER_NOT_FOUND')
        
        # コードが一致するエリアを探す
        areas = Area.get_all(include_inactive=False)
        unlocked_area = None
        
        for area in areas:
            if area.is_restricted and area.access_code == area_code:
                unlocked_area = area.area_id
                break
        
        if not unlocked_area:
            raise ValueError('INVALID_AREA_CODE')
        
        # すでに解放済みかチェック
        if unlocked_area in user.unlocked_areas:
            raise ValueError('AREA_ALREADY_UNLOCKED')
        
        # エリアを解放
        from utils.dynamodb import get_table
        from config import config
        
        table = get_table(config.USERS_TABLE)
        unlocked_areas = user.unlocked_areas + [unlocked_area]
        
        table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='SET unlocked_areas = :areas',
            ExpressionAttributeValues={':areas': unlocked_areas}
        )
        
        user.unlocked_areas = unlocked_areas
        
        return {
            'success': True,
            'unlocked_area': unlocked_area,
            'user': user.to_dict()
        }
