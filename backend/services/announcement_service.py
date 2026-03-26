from models.announcement import Announcement
from typing import Dict, List


class AnnouncementService:
    @staticmethod
    def get_active() -> List[Dict]:
        """公開中のお知らせ一覧を取得（ユーザー向け）"""
        announcements = Announcement.get_active()
        return [a.to_dict() for a in announcements]

    @staticmethod
    def get_all() -> List[Dict]:
        """全お知らせを取得（管理画面向け）"""
        announcements = Announcement.get_all()
        return [a.to_dict() for a in announcements]

    @staticmethod
    def create(data: Dict) -> Dict:
        """お知らせを作成"""
        title = data.get('title', '').strip()
        body = data.get('body', '').strip()
        start_date = data.get('start_date', '').strip()
        end_date = data.get('end_date', '').strip()

        if not title:
            raise ValueError('TITLE_REQUIRED')
        if not body:
            raise ValueError('BODY_REQUIRED')
        if not start_date:
            raise ValueError('START_DATE_REQUIRED')
        if not end_date:
            raise ValueError('END_DATE_REQUIRED')
        if start_date > end_date:
            raise ValueError('START_DATE_MUST_BE_BEFORE_END_DATE')

        announcement = Announcement(
            title=title,
            body=body,
            start_date=start_date,
            end_date=end_date,
            is_active=data.get('is_active', True),
        )
        announcement.save()
        return announcement.to_dict()

    @staticmethod
    def update(announcement_id: str, data: Dict) -> Dict:
        """お知らせを更新"""
        announcement = Announcement.get(announcement_id)
        if not announcement:
            raise ValueError('ANNOUNCEMENT_NOT_FOUND')

        if 'title' in data:
            announcement.title = data['title'].strip() or announcement.title
        if 'body' in data:
            announcement.body = data['body']
        if 'start_date' in data:
            announcement.start_date = data['start_date']
        if 'end_date' in data:
            announcement.end_date = data['end_date']
        if 'is_active' in data:
            announcement.is_active = bool(data['is_active'])

        start = data.get('start_date', announcement.start_date)
        end = data.get('end_date', announcement.end_date)
        if start > end:
            raise ValueError('START_DATE_MUST_BE_BEFORE_END_DATE')

        announcement.save()
        return announcement.to_dict()

    @staticmethod
    def delete(announcement_id: str) -> Dict:
        """お知らせを削除"""
        announcement = Announcement.get(announcement_id)
        if not announcement:
            raise ValueError('ANNOUNCEMENT_NOT_FOUND')
        announcement.delete()
        return {'announcement_id': announcement_id, 'deleted': True}
