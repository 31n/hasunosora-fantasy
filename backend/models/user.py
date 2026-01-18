from datetime import datetime
from typing import Optional, Dict
from decimal import Decimal
from utils.dynamodb import get_table
from config import config

class User:
    def __init__(self, user_id: str, nickname: Optional[str] = None, 
                 total_score: int = 0, selected_area: Optional[str] = None,
                 unlocked_areas: Optional[list] = None,
                 created_at: Optional[str] = None):
        self.user_id = user_id
        self.nickname = nickname
        # Decimal型をintに変換
        self.total_score = int(total_score) if isinstance(total_score, Decimal) else total_score
        self.selected_area = selected_area  # 選択中のエリアID（nullable）
        self.unlocked_areas = unlocked_areas or []  # 解放済みエリアのリスト
        self.created_at = created_at or datetime.utcnow().isoformat()
    
    def to_dict(self) -> Dict:
        """辞書形式に変換"""
        return {
            'user_id': self.user_id,
            'nickname': self.nickname,
            'total_score': int(self.total_score),  # 必ずintに変換
            'selected_area': self.selected_area,
            'unlocked_areas': self.unlocked_areas,
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
        return User(
            user_id=item['user_id'],
            nickname=item.get('nickname'),
            total_score=item.get('total_score', 0),
            selected_area=item.get('selected_area'),
            unlocked_areas=item.get('unlocked_areas', []),
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
    
    def update_selected_area(self, selected_area: Optional[str]):
        """選択中のエリアを更新"""
        table = get_table(config.USERS_TABLE)
        table.update_item(
            Key={'user_id': self.user_id},
            UpdateExpression='SET selected_area = :selected_area',
            ExpressionAttributeValues={':selected_area': selected_area}
        )
        self.selected_area = selected_area
    
    def add_score(self, score: int):
        """得点を加算"""
        table = get_table(config.USERS_TABLE)
        table.update_item(
            Key={'user_id': self.user_id},
            UpdateExpression='SET total_score = total_score + :score',
            ExpressionAttributeValues={':score': score}
        )
        self.total_score += score