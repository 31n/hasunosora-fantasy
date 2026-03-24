from models.quiz_type import QuizType
from typing import Dict, List, Optional


class QuizTypeService:
    @staticmethod
    def get_all(include_inactive: bool = False) -> List[Dict]:
        """クイズタイプ一覧を取得"""
        types = QuizType.get_all(include_inactive=include_inactive)
        return [t.to_dict() for t in types]

    @staticmethod
    def create(data: Dict) -> Dict:
        """クイズタイプを作成"""
        quiz_type_id = data.get('quiz_type_id', '').strip()
        name = data.get('name', '').strip()

        if not quiz_type_id:
            raise ValueError('QUIZ_TYPE_ID_REQUIRED')
        if not name:
            raise ValueError('QUIZ_TYPE_NAME_REQUIRED')

        # 重複チェック
        if QuizType.get(quiz_type_id):
            raise ValueError('QUIZ_TYPE_ALREADY_EXISTS')

        qt = QuizType(
            quiz_type_id=quiz_type_id,
            name=name,
            description=data.get('description', ''),
            display_order=int(data.get('display_order', 0)),
            is_active=data.get('is_active', True),
        )
        qt.save()
        return qt.to_dict()

    @staticmethod
    def update(quiz_type_id: str, data: Dict) -> Dict:
        """クイズタイプを更新"""
        qt = QuizType.get(quiz_type_id)
        if not qt:
            raise ValueError('QUIZ_TYPE_NOT_FOUND')

        if 'name' in data:
            qt.name = data['name'].strip() or qt.name
        if 'description' in data:
            qt.description = data['description']
        if 'display_order' in data:
            qt.display_order = int(data['display_order'])
        if 'is_active' in data:
            qt.is_active = bool(data['is_active'])

        qt.save()
        return qt.to_dict()

    @staticmethod
    def delete(quiz_type_id: str) -> Dict:
        """クイズタイプを削除"""
        qt = QuizType.get(quiz_type_id)
        if not qt:
            raise ValueError('QUIZ_TYPE_NOT_FOUND')
        qt.delete()
        return {'quiz_type_id': quiz_type_id, 'deleted': True}
