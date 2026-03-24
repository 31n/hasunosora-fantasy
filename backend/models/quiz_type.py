from datetime import datetime, timezone
from typing import Optional, Dict, List
from utils.dynamodb import get_table
from config import config


class QuizType:
    def __init__(self, quiz_type_id: str, name: str,
                 description: str = '',
                 display_order: int = 0,
                 is_active: bool = True,
                 created_at: Optional[str] = None,
                 updated_at: Optional[str] = None):
        self.quiz_type_id = quiz_type_id
        self.name = name
        self.description = description
        self.display_order = display_order
        self.is_active = bool(is_active)
        self.created_at = created_at or datetime.now(timezone.utc).isoformat()
        self.updated_at = updated_at or datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> Dict:
        return {
            'quiz_type_id': self.quiz_type_id,
            'name': self.name,
            'description': self.description,
            'display_order': self.display_order,
            'is_active': self.is_active,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }

    def save(self):
        self.updated_at = datetime.now(timezone.utc).isoformat()
        table = get_table(config.QUIZ_TYPES_TABLE)
        table.put_item(Item=self.to_dict())

    def delete(self):
        table = get_table(config.QUIZ_TYPES_TABLE)
        table.delete_item(Key={'quiz_type_id': self.quiz_type_id})

    @staticmethod
    def get(quiz_type_id: str) -> Optional['QuizType']:
        table = get_table(config.QUIZ_TYPES_TABLE)
        response = table.get_item(Key={'quiz_type_id': quiz_type_id})
        if 'Item' not in response:
            return None
        return QuizType._from_item(response['Item'])

    @staticmethod
    def get_all(include_inactive: bool = False) -> List['QuizType']:
        table = get_table(config.QUIZ_TYPES_TABLE)
        response = table.scan()
        items = response.get('Items', [])
        types = [QuizType._from_item(item) for item in items]
        if not include_inactive:
            types = [t for t in types if t.is_active]
        types.sort(key=lambda t: t.display_order)
        return types

    @staticmethod
    def _from_item(item: Dict) -> 'QuizType':
        from decimal import Decimal
        display_order = item.get('display_order', 0)
        if isinstance(display_order, Decimal):
            display_order = int(display_order)
        return QuizType(
            quiz_type_id=item['quiz_type_id'],
            name=item['name'],
            description=item.get('description', ''),
            display_order=display_order,
            is_active=item.get('is_active', True),
            created_at=item.get('created_at'),
            updated_at=item.get('updated_at'),
        )
