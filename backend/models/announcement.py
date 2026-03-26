from datetime import datetime, timezone
from typing import Optional, Dict, List
from utils.dynamodb import get_table
from config import config
import uuid


class Announcement:
    def __init__(self,
                 title: str,
                 body: str,
                 start_date: str,
                 end_date: str,
                 is_active: bool = True,
                 announcement_id: Optional[str] = None,
                 created_at: Optional[str] = None,
                 updated_at: Optional[str] = None):
        self.announcement_id = announcement_id or str(uuid.uuid4())
        self.title = title
        self.body = body
        self.start_date = start_date  # ISO date string e.g. "2026-03-27"
        self.end_date = end_date      # ISO date string e.g. "2026-04-03"
        self.is_active = bool(is_active)
        self.created_at = created_at or datetime.now(timezone.utc).isoformat()
        self.updated_at = updated_at or datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> Dict:
        return {
            'announcement_id': self.announcement_id,
            'title': self.title,
            'body': self.body,
            'start_date': self.start_date,
            'end_date': self.end_date,
            'is_active': self.is_active,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }

    def save(self):
        self.updated_at = datetime.now(timezone.utc).isoformat()
        table = get_table(config.ANNOUNCEMENTS_TABLE)
        table.put_item(Item=self.to_dict())

    def delete(self):
        table = get_table(config.ANNOUNCEMENTS_TABLE)
        table.delete_item(Key={'announcement_id': self.announcement_id})

    @staticmethod
    def get(announcement_id: str) -> Optional['Announcement']:
        table = get_table(config.ANNOUNCEMENTS_TABLE)
        response = table.get_item(Key={'announcement_id': announcement_id})
        if 'Item' not in response:
            return None
        return Announcement._from_item(response['Item'])

    @staticmethod
    def get_all() -> List['Announcement']:
        table = get_table(config.ANNOUNCEMENTS_TABLE)
        response = table.scan()
        items = response.get('Items', [])
        announcements = [Announcement._from_item(item) for item in items]
        announcements.sort(key=lambda a: a.created_at, reverse=True)
        return announcements

    @staticmethod
    def get_active() -> List['Announcement']:
        """現在公開中（is_active=True かつ start_date <= today <= end_date）のみ返す"""
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        all_items = Announcement.get_all()
        return [
            a for a in all_items
            if a.is_active and a.start_date <= today <= a.end_date
        ]

    @staticmethod
    def _from_item(item: Dict) -> 'Announcement':
        return Announcement(
            announcement_id=item['announcement_id'],
            title=item['title'],
            body=item['body'],
            start_date=item['start_date'],
            end_date=item['end_date'],
            is_active=item.get('is_active', True),
            created_at=item.get('created_at'),
            updated_at=item.get('updated_at'),
        )
