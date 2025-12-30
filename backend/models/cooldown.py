from datetime import datetime, timedelta
from typing import Optional, Dict
from utils.dynamodb import get_table
from config import config

class QuizCooldown:
    def __init__(self, user_id: str, spot_id: str, 
                 failed_at: Optional[str] = None,
                 cooldown_until: Optional[str] = None):
        self.user_id = user_id
        self.spot_id = spot_id
        self.failed_at = failed_at or datetime.utcnow().isoformat()
        
        if cooldown_until:
            self.cooldown_until = cooldown_until
        else:
            # クールタイムを計算
            cooldown_minutes = config.QUIZ_COOLDOWN_MINUTES
            until_time = datetime.utcnow() + timedelta(minutes=cooldown_minutes)
            self.cooldown_until = until_time.isoformat()
    
    def to_dict(self) -> Dict:
        """辞書形式に変換"""
        # TTL用のUNIXタイムスタンプも含める
        cooldown_dt = datetime.fromisoformat(self.cooldown_until.replace('Z', '+00:00'))
        ttl = int(cooldown_dt.timestamp())
        
        return {
            'user_spot_id': f"{self.user_id}#{self.spot_id}",
            'user_id': self.user_id,
            'spot_id': self.spot_id,
            'failed_at': self.failed_at,
            'cooldown_until': self.cooldown_until,
            'ttl': ttl
        }
    
    def save(self):
        """DynamoDBに保存"""
        table = get_table(config.COOLDOWNS_TABLE)
        table.put_item(Item=self.to_dict())
    
    @staticmethod
    def get(user_id: str, spot_id: str) -> Optional['QuizCooldown']:
        """クールタイム情報を取得"""
        table = get_table(config.COOLDOWNS_TABLE)
        user_spot_id = f"{user_id}#{spot_id}"
        
        response = table.get_item(Key={'user_spot_id': user_spot_id})
        
        if 'Item' not in response:
            return None
        
        item = response['Item']
        return QuizCooldown(
            user_id=item['user_id'],
            spot_id=item['spot_id'],
            failed_at=item['failed_at'],
            cooldown_until=item['cooldown_until']
        )
    
    @staticmethod
    def is_on_cooldown(user_id: str, spot_id: str) -> tuple[bool, Optional[str]]:
        """
        クールタイム中かチェック
        
        Returns:
            (クールタイム中か, クールタイム終了時刻)
        """
        cooldown = QuizCooldown.get(user_id, spot_id)
        
        if not cooldown:
            return False, None
        
        # クールタイム終了時刻を確認
        cooldown_until = datetime.fromisoformat(
            cooldown.cooldown_until.replace('Z', '+00:00')
        )
        now = datetime.utcnow()
        
        if now < cooldown_until:
            return True, cooldown.cooldown_until
        else:
            return False, None
    
    @staticmethod
    def delete(user_id: str, spot_id: str):
        """クールタイム情報を削除"""
        table = get_table(config.COOLDOWNS_TABLE)
        user_spot_id = f"{user_id}#{spot_id}"
        table.delete_item(Key={'user_spot_id': user_spot_id})
