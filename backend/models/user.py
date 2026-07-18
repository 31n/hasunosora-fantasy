from datetime import datetime, timezone
from typing import Optional, Dict, List
from decimal import Decimal
from utils.dynamodb import get_table
from config import config

class User:
    def __init__(self, user_id: str, nickname: Optional[str] = None,
                 total_score: int = 0, selected_areas: Optional[List[str]] = None,
                 unlocked_areas: Optional[list] = None,
                 selected_quiz_type: Optional[str] = None,
                 created_at: Optional[str] = None):
        self.user_id = user_id
        self.nickname = nickname
        # Decimal型をintに変換
        self.total_score = int(total_score) if isinstance(total_score, Decimal) else total_score
        self.selected_areas = selected_areas or []  # 選択中のエリアIDリスト
        self.unlocked_areas = unlocked_areas or []  # 解放済みエリアのリスト
        self.selected_quiz_type = selected_quiz_type  # 選択中のクイズタイプID（nullable = デフォルト）
        self.created_at = created_at or datetime.now(timezone.utc).isoformat()
    
    def to_dict(self) -> Dict:
        """辞書形式に変換"""
        return {
            'user_id': self.user_id,
            'nickname': self.nickname,
            'total_score': int(self.total_score),  # 必ずintに変換
            'selected_areas': self.selected_areas,
            'unlocked_areas': self.unlocked_areas,
            'selected_quiz_type': self.selected_quiz_type,
            'created_at': self.created_at
        }
    
    def save(self):
        """DynamoDBに保存"""
        table = get_table(config.USERS_TABLE)
        table.put_item(Item=self.to_dict())
    
    @staticmethod
    def get(user_id: str) -> Optional['User']:
        """ユーザーIDからユーザーを取得"""
        table = get_table(config.USERS_TABLE)
        response = table.get_item(Key={'user_id': user_id})
        
        if 'Item' not in response:
            return None
        
        item = response['Item']
        # マイグレーション: 旧 selected_area (str) → 新 selected_areas (list)
        if 'selected_areas' in item:
            selected_areas = list(item['selected_areas'])
        elif item.get('selected_area'):
            selected_areas = [item['selected_area']]
        else:
            selected_areas = []
        return User(
            user_id=item['user_id'],
            nickname=item.get('nickname'),
            total_score=item.get('total_score', 0),
            selected_areas=selected_areas,
            unlocked_areas=item.get('unlocked_areas', []),
            selected_quiz_type=item.get('selected_quiz_type'),
            created_at=item.get('created_at')
        )
    
    def update_nickname(self, nickname: str):
        """ニックネームを更新"""
        table = get_table(config.USERS_TABLE)
        table.update_item(
            Key={'user_id': self.user_id},
            UpdateExpression='SET nickname = :nickname',
            ExpressionAttributeValues={':nickname': nickname}
        )
        self.nickname = nickname
    
    def update_selected_areas(self, selected_areas: List[str]):
        """選択中のエリアリストを更新"""
        table = get_table(config.USERS_TABLE)
        table.update_item(
            Key={'user_id': self.user_id},
            UpdateExpression='SET selected_areas = :selected_areas',
            ExpressionAttributeValues={':selected_areas': selected_areas}
        )
        self.selected_areas = selected_areas

    def update_selected_quiz_type(self, selected_quiz_type: Optional[str]):
        """選択中のクイズタイプを更新"""
        table = get_table(config.USERS_TABLE)
        table.update_item(
            Key={'user_id': self.user_id},
            UpdateExpression='SET selected_quiz_type = :sqt',
            ExpressionAttributeValues={':sqt': selected_quiz_type}
        )
        self.selected_quiz_type = selected_quiz_type
    
    def add_score(self, score: int):
        """得点を加算"""
        table = get_table(config.USERS_TABLE)
        table.update_item(
            Key={'user_id': self.user_id},
            UpdateExpression='SET total_score = total_score + :score',
            ExpressionAttributeValues={':score': score}
        )
        self.total_score += score