from datetime import datetime, timedelta, timezone
from typing import Optional, Dict

# quiz_type_id が記録されていない（この項目を足す前の）回答済み情報を表す
UNKNOWN_QUIZ_TYPE = object()
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
                 cooldown_until: Optional[str] = None,
                 quiz_type_id=UNKNOWN_QUIZ_TYPE):
        self.user_id = user_id
        self.spot_id = spot_id
        # 回答したクイズのタイプ（None = デフォルトのクイズ）
        self.quiz_type_id = quiz_type_id
        self.answered_at = answered_at or datetime.now(timezone.utc).isoformat()

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
        
        item = {
            'user_spot_id': f"{self.user_id}#{self.spot_id}",
            'user_id': self.user_id,
            'spot_id': self.spot_id,
            'answered_at': self.answered_at,
            'cooldown_until': self.cooldown_until,
            'ttl': ttl
        }
        if self.quiz_type_id is not UNKNOWN_QUIZ_TYPE:
            item['quiz_type_id'] = self.quiz_type_id
        return item
    
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
            cooldown_until=item['cooldown_until'],
            quiz_type_id=item['quiz_type_id'] if 'quiz_type_id' in item else UNKNOWN_QUIZ_TYPE
        )
    
    def is_active(self) -> bool:
        """当日（JST）の回答済み期間中か"""
        cooldown_until = datetime.fromisoformat(self.cooldown_until.replace('Z', '+00:00'))
        return datetime.now(timezone.utc) < cooldown_until

    @staticmethod
    def get_active(user_id: str, spot_id: str) -> Optional['QuizCooldown']:
        """当日（JST）回答済みなら、その回答済み情報を返す"""
        cooldown = QuizCooldown.get(user_id, spot_id)
        return cooldown if cooldown and cooldown.is_active() else None

    @staticmethod
    def is_on_cooldown(user_id: str, spot_id: str) -> tuple[bool, Optional[str]]:
        """
        当日（JST）クイズ回答済みかチェック

        Returns:
            (回答済みか, クールタイム終了時刻＝翌日JST 0時のUTC)
        """
        cooldown = QuizCooldown.get_active(user_id, spot_id)
        if cooldown:
            return True, cooldown.cooldown_until
        return False, None
    
    @staticmethod
    def delete(user_id: str, spot_id: str):
        """クールタイム情報を削除"""
        table = get_table(config.COOLDOWNS_TABLE)
        user_spot_id = f"{user_id}#{spot_id}"
        table.delete_item(Key={'user_spot_id': user_spot_id})
