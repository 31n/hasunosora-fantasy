from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional
from decimal import Decimal
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
        # Decimal型をintに変換
        self.score_earned = int(score_earned) if isinstance(score_earned, Decimal) else score_earned
    
    def to_dict(self) -> Dict:
        """辞書形式に変換"""
        return {
            'user_id': self.user_id,
            'spot_id_timestamp': f"{self.spot_id}#{self.checked_in_at}",
            'spot_id': self.spot_id,
            'checked_in_at': self.checked_in_at,
            'quiz_answered': self.quiz_answered,
            'quiz_correct': self.quiz_correct,
            'score_earned': int(self.score_earned)  # 必ずintに変換
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
    
    @staticmethod
    def has_answered_quiz(user_id: str, spot_id: str) -> bool:
        """ユーザーが既にこのスポットのクイズに回答済みか確認"""
        table = get_table(config.CHECKINS_TABLE)
        
        response = table.query(
            KeyConditionExpression='user_id = :uid',
            FilterExpression='spot_id = :sid AND quiz_answered = :answered',
            ExpressionAttributeValues={
                ':uid': user_id,
                ':sid': spot_id,
                ':answered': True
            },
            Limit=1
        )
        
        return len(response.get('Items', [])) > 0

    @staticmethod
    def is_within_cooldown(user_id: str, spot_id: str) -> bool:
        """チェックインクールタイム中か確認（CHECKIN_COOLDOWN_MINUTES以内に同スポットをチェックイン済みか）"""
        table = get_table(config.CHECKINS_TABLE)

        cutoff = (datetime.utcnow() - timedelta(minutes=config.CHECKIN_COOLDOWN_MINUTES)).isoformat()

        response = table.query(
            KeyConditionExpression='user_id = :uid AND spot_id_timestamp BETWEEN :start AND :end',
            ExpressionAttributeValues={
                ':uid': user_id,
                ':start': f"{spot_id}#{cutoff}",
                ':end': f"{spot_id}~"
            },
            Limit=1
        )

        return len(response.get('Items', [])) > 0

    @staticmethod
    def has_checkin_today(user_id: str, spot_id: str) -> bool:
        """当日（JST）にポイント付与済みのチェックインがあるか確認"""
        table = get_table(config.CHECKINS_TABLE)

        JST = timezone(timedelta(hours=9))
        today_jst = datetime.now(JST).replace(hour=0, minute=0, second=0, microsecond=0)
        today_utc = today_jst.astimezone(timezone.utc).replace(tzinfo=None).isoformat()

        response = table.query(
            KeyConditionExpression='user_id = :uid AND spot_id_timestamp BETWEEN :start AND :end',
            FilterExpression='score_earned > :zero',
            ExpressionAttributeValues={
                ':uid': user_id,
                ':start': f"{spot_id}#{today_utc}",
                ':end': f"{spot_id}~",
                ':zero': 0
            },
            Limit=1
        )

        return len(response.get('Items', [])) > 0

    @staticmethod
    def has_answered_quiz_today(user_id: str, spot_id: str) -> bool:
        """当日（JST）にクイズに回答済みか確認"""
        table = get_table(config.CHECKINS_TABLE)

        JST = timezone(timedelta(hours=9))
        today_jst = datetime.now(JST).replace(hour=0, minute=0, second=0, microsecond=0)
        today_utc = today_jst.astimezone(timezone.utc).replace(tzinfo=None).isoformat()

        response = table.query(
            KeyConditionExpression='user_id = :uid AND spot_id_timestamp BETWEEN :start AND :end',
            FilterExpression='quiz_answered = :answered',
            ExpressionAttributeValues={
                ':uid': user_id,
                ':start': f"{spot_id}#{today_utc}",
                ':end': f"{spot_id}~",
                ':answered': True
            },
            Limit=1
        )

        return len(response.get('Items', [])) > 0