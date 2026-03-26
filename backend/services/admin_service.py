from models.spot import Spot
from utils.s3 import upload_image, delete_image
from config import config
from typing import Dict, List
import base64
import collections
from datetime import datetime, timezone, timedelta

class AdminService:
    @staticmethod
    def authenticate(password: str) -> bool:
        """管理者認証"""
        return password == config.ADMIN_PASSWORD
    
    @staticmethod
    def get_all_spots() -> Dict:
        """全スポットを取得（管理用）"""
        spots = Spot.get_all()
        return {
            'spots': [spot.to_dict(for_dynamodb=False) for spot in spots]
        }
    
    @staticmethod
    def create_spot(spot_data: Dict) -> Dict:
        """スポットを作成"""
        # クイズリストのバリデーション
        quizzes = spot_data.get('quizzes', [])
        for q in quizzes:
            AdminService._validate_quiz(q)

        # 座標のバリデーション
        AdminService._validate_coordinates(
            spot_data.get('latitude'),
            spot_data.get('longitude')
        )

        spot = Spot(
            spot_name=spot_data['spot_name'],
            description=spot_data.get('description', ''),
            latitude=float(spot_data['latitude']),
            longitude=float(spot_data['longitude']),
            detection_radius=float(spot_data.get('detection_radius', 100)),
            images=spot_data.get('images', []),
            genre=spot_data.get('genre', []),
            area=spot_data.get('area'),
            reading=spot_data.get('reading') or None,
            url=spot_data.get('url') or None,
            quizzes=quizzes,
        )

        spot.save()

        return {
            'spot_id': spot.spot_id,
            'spot_name': spot.spot_name,
            'created_at': spot.created_at,
            'version': spot.version
        }
    
    @staticmethod
    def update_spot(spot_id: str, spot_data: Dict) -> Dict:
        """スポットを更新"""
        spot = Spot.get(spot_id)

        if not spot:
            raise ValueError('SPOT_NOT_FOUND')

        # クイズリストのバリデーション
        if 'quizzes' in spot_data:
            quizzes = spot_data['quizzes'] or []
            for q in quizzes:
                AdminService._validate_quiz(q)

        # 座標のバリデーション
        if 'latitude' in spot_data or 'longitude' in spot_data:
            AdminService._validate_coordinates(
                spot_data.get('latitude', spot.latitude),
                spot_data.get('longitude', spot.longitude)
            )

        # 更新
        spot.spot_name = spot_data.get('spot_name', spot.spot_name)
        spot.description = spot_data.get('description', spot.description)
        spot.latitude = float(spot_data.get('latitude', spot.latitude))
        spot.longitude = float(spot_data.get('longitude', spot.longitude))
        spot.detection_radius = float(spot_data.get('detection_radius', spot.detection_radius))
        spot.images = spot_data.get('images', spot.images)
        spot.genre = spot_data.get('genre', spot.genre)
        spot.area = spot_data.get('area', spot.area)
        if 'reading' in spot_data:
            spot.reading = spot_data['reading'] or None
        if 'url' in spot_data:
            spot.url = spot_data['url'] or None
        if 'quizzes' in spot_data:
            spot.quizzes = spot_data['quizzes'] or []

        spot.save()

        return {
            'spot_id': spot.spot_id,
            'updated_at': spot.updated_at,
            'version': spot.version
        }
    
    @staticmethod
    def delete_spot(spot_id: str) -> Dict:
        """スポットを削除"""
        spot = Spot.get(spot_id)
        
        if not spot:
            raise ValueError('SPOT_NOT_FOUND')
        
        # S3の画像も削除
        for image_url in spot.images:
            delete_image(image_url)
        
        spot.delete()
        
        return {
            'spot_id': spot_id,
            'deleted': True,
            'version': Spot.get_master_version()['version']
        }
    
    @staticmethod
    def upload_image(file_data: bytes, content_type: str) -> Dict:
        """画像をアップロード"""
        # ファイルタイプのバリデーション
        allowed_types = ['image/jpeg', 'image/png', 'image/webp']
        if content_type not in allowed_types:
            raise ValueError('INVALID_FILE_TYPE')
        
        # ファイルサイズチェック（5MB制限）
        max_size = 5 * 1024 * 1024  # 5MB
        if len(file_data) > max_size:
            raise ValueError('FILE_TOO_LARGE')
        
        url = upload_image(file_data, content_type)
        
        return {
            'url': url,
            'uploaded_at': Spot.get_master_version()['updated_at']
        }
    
    @staticmethod
    def get_stats() -> Dict:
        """ユーザー統計を取得（過去30日）"""
        from utils.dynamodb import get_table

        now = datetime.now(timezone.utc)
        thirty_days_ago = (now - timedelta(days=30)).isoformat()
        seven_days_ago = (now - timedelta(days=7)).isoformat()

        # ユーザーテーブルをフルスキャン（created_at のみ取得）
        users_table = get_table(config.USERS_TABLE)
        user_items = []
        response = users_table.scan(ProjectionExpression='created_at')
        user_items.extend(response.get('Items', []))
        while 'LastEvaluatedKey' in response:
            response = users_table.scan(
                ProjectionExpression='created_at',
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            user_items.extend(response.get('Items', []))

        total_users = len(user_items)

        # 日別新規ユーザー数（過去30日）
        daily_new_users_map: Dict[str, int] = collections.defaultdict(int)
        cutoff_date = thirty_days_ago[:10]
        for item in user_items:
            date = (item.get('created_at') or '')[:10]
            if date >= cutoff_date:
                daily_new_users_map[date] += 1

        # チェックインテーブルをスキャン（過去30日）
        checkins_table = get_table(config.CHECKINS_TABLE)
        checkin_items = []
        response = checkins_table.scan(
            FilterExpression='checked_in_at >= :d',
            ExpressionAttributeValues={':d': thirty_days_ago}
        )
        checkin_items.extend(response.get('Items', []))
        while 'LastEvaluatedKey' in response:
            response = checkins_table.scan(
                FilterExpression='checked_in_at >= :d',
                ExpressionAttributeValues={':d': thirty_days_ago},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            checkin_items.extend(response.get('Items', []))

        # 日別アクティブユーザー数（ユニーク user_id）
        daily_active_map: Dict[str, set] = collections.defaultdict(set)
        active_users_7d: set = set()
        for item in checkin_items:
            date = (item.get('checked_in_at') or '')[:10]
            user_id = item.get('user_id', '')
            if user_id:
                daily_active_map[date].add(user_id)
                if (item.get('checked_in_at') or '') >= seven_days_ago:
                    active_users_7d.add(user_id)

        # 過去30日の日付リスト（昇順）
        dates = [(now - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(29, -1, -1)]

        return {
            'total_users': total_users,
            'active_users_7d': len(active_users_7d),
            'daily_new_users': [
                {'date': d, 'count': daily_new_users_map.get(d, 0)} for d in dates
            ],
            'daily_active_users': [
                {'date': d, 'count': len(daily_active_map.get(d, set()))} for d in dates
            ],
        }

    @staticmethod
    def _validate_quiz(quiz: Dict):
        """クイズのバリデーション"""
        if not quiz:
            raise ValueError('INVALID_QUIZ')
        
        # 必須フィールド
        required_fields = ['question', 'choices', 'correct_answer', 'score']
        for field in required_fields:
            if field not in quiz:
                raise ValueError('INVALID_QUIZ')
        
        # 選択肢数チェック（2〜4個）
        choices = quiz.get('choices', [])
        if not isinstance(choices, list) or len(choices) < 2 or len(choices) > 4:
            raise ValueError('INVALID_QUIZ')
        
        # 正解インデックスチェック
        correct_answer = quiz.get('correct_answer')
        if not isinstance(correct_answer, int) or correct_answer < 0 or correct_answer >= len(choices):
            raise ValueError('INVALID_QUIZ')
        
        # 得点チェック
        score = quiz.get('score')
        if not isinstance(score, int) or score < 1:
            raise ValueError('INVALID_QUIZ')
    
    @staticmethod
    def _validate_coordinates(latitude: float, longitude: float):
        """座標のバリデーション"""
        try:
            lat = float(latitude)
            lon = float(longitude)
            
            if lat < -90 or lat > 90:
                raise ValueError('INVALID_COORDINATES')
            
            if lon < -180 or lon > 180:
                raise ValueError('INVALID_COORDINATES')
        except (ValueError, TypeError):
            raise ValueError('INVALID_COORDINATES')