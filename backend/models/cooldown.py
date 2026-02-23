from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from utils.dynamodb import get_table
from config import config

JST = timezone(timedelta(hours=9))

def _next_midnight_jst_as_utc() -> datetime:
    """翌日JST 0時をUTCで返す"""
    now_jst = datetime.now(JST)
    next_midnight_jst = (now_jst + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return next_midnight_jst.astimezone(timezone.utc)


class QuizCooldown:
    def __init__(self, user_id: str, spot_id: str,
                 answered_at: Optional[str] = None,
                 cooldown_until: Optional[str] = None):
        self.user_id = user_id
        self.spot_id = spot_id
        self.answered_at = answered_at or datetime.utcnow().isoformat()

        if cooldown_until:
            self.cooldown_until = cooldown_until
        else:
            # クールタイム終了 = 翌日JST 0時
            self.cooldown_until = _next_midnight_jst_as_utc().isoformat()
    
    def to_dict(self) -> Dict:
        """辞書形式に変換"""
        # TTL用のUNIXタイムスタンプも含める
        cooldown_dt = datetime.fromisoformat(self.cooldown_until.replace('Z', '+00:00'))
        ttl = int(cooldown_dt.timestamp())
        
        return {
            'user_spot_id': f"{self.user_id}#{self.spot_id}",
            'user_id': self.user_id,
            'spot_id': self.spot_id,
            'answered_at': self.answered_at,
            'cooldown_until': self.cooldown_until,
            'ttl': ttl
        }
    
    def save(self):
        """DynamoDBに保存"""
        table = get_table(config.COOLDOWNS_TABLE)
        table.put_item(Item=self.to_dict())
    
    @staticmethod
    def get(user_id: str, spot_id: str) -> Optional['QuizCooldown']:
        """クイズ回答済み情報を取得"""
        table = get_table(config.COOLDOWNS_TABLE)
        user_spot_id = f"{user_id}#{spot_id}"
        
        response = table.get_item(Key={'user_spot_id': user_spot_id})
        
        if 'Item' not in response:
            return None
        
        item = response['Item']
        return QuizCooldown(
            user_id=item['user_id'],
            spot_id=item['spot_id'],
            answered_at=item.get('answered_at'),
            cooldown_until=item['cooldown_until']
        )
    
    @staticmethod
    def is_on_cooldown(user_id: str, spot_id: str) -> tuple[bool, Optional[str]]:
        """
        当日（JST）クイズ回答済みかチェック

        Returns:
            (回答済みか, クールタイム終了時刻＝翌日JST 0時のUTC)
        """
        cooldown = QuizCooldown.get(user_id, spot_id)

        if not cooldown:
            return False, None

        # cooldown_until（翌日JST 0時のUTC）と現在時刻を比較
        cooldown_until = datetime.fromisoformat(
            cooldown.cooldown_until.replace('Z', '+00:00')
        )
        now = datetime.now(timezone.utc)

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
