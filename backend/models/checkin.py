from datetime import datetime
from typing import List, Dict, Optional
from utils.dynamodb import get_table
from config import config

class CheckIn:
    def __init__(self, user_id: str, spot_id: str, 
                 checked_in_at: Optional[str] = None,
                 quiz_answered: bool = False, quiz_correct: bool = False,
                 score_earned: int = 0):
        self.user_id = user_id
        self.spot_id = spot_id
        self.checked_in_at = checked_in_at or datetime.utcnow().isoformat()
        self.quiz_answered = quiz_answered
        self.quiz_correct = quiz_correct
        self.score_earned = score_earned
    
    def to_dict(self) -> Dict:
        """辞書形式に変換"""
        return {
            'user_id': self.user_id,
            'spot_id_timestamp': f"{self.spot_id}#{self.checked_in_at}",
            'spot_id': self.spot_id,
            'checked_in_at': self.checked_in_at,
            'quiz_answered': self.quiz_answered,
            'quiz_correct': self.quiz_correct,
            'score_earned': self.score_earned
        }
    
    def save(self):
        """DynamoDBに保存"""
        table = get_table(config.CHECKINS_TABLE)
        table.put_item(Item=self.to_dict())
    
    @staticmethod
    def get_user_history(user_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """ユーザーのチェックイン履歴を取得"""
        table = get_table(config.CHECKINS_TABLE)
        
        response = table.query(
            KeyConditionExpression='user_id = :uid',
            ExpressionAttributeValues={':uid': user_id},
            ScanIndexForward=False,  # 降順（新しい順）
            Limit=limit + offset
        )
        
        items = response.get('Items', [])
        # オフセット処理
        items = items[offset:offset + limit]
        
        return items
    
    @staticmethod
    def has_visited(user_id: str, spot_id: str) -> bool:
        """ユーザーが既にスポットを訪問済みか確認"""
        table = get_table(config.CHECKINS_TABLE)
        
        response = table.query(
            KeyConditionExpression='user_id = :uid',
            FilterExpression='spot_id = :sid',
            ExpressionAttributeValues={
                ':uid': user_id,
                ':sid': spot_id
            },
            Limit=1
        )
        
        return len(response.get('Items', [])) > 0
    
    @staticmethod
    def count_visits(user_id: str, spot_id: str) -> int:
        """ユーザーの特定スポットへの訪問回数を取得"""
        table = get_table(config.CHECKINS_TABLE)
        
        response = table.query(
            KeyConditionExpression='user_id = :uid',
            FilterExpression='spot_id = :sid',
            ExpressionAttributeValues={
                ':uid': user_id,
                ':sid': spot_id
            }
        )
        
        return len(response.get('Items', []))
