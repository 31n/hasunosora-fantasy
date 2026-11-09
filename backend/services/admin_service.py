from models.spot import Spot
from models.checkin import _parse_utc
from utils.s3 import upload_image, delete_image
from utils.ssm import get_admin_password
from config import config
from typing import Dict, List, Optional
import base64
import hmac
import collections
from datetime import datetime, timezone, timedelta

JST = timezone(timedelta(hours=9))


class AdminService:
    @staticmethod
    def authenticate(password: str) -> bool:
        """管理者認証（パスワードを読めない・既定値のままなら常に拒否する）"""
        expected = get_admin_password() or ''
        if not expected or expected.startswith('change_me'):
            return False
        if not isinstance(password, str) or not password:
            return False
        return hmac.compare_digest(password.encode('utf-8'), expected.encode('utf-8'))
    
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
            areas=spot_data.get('areas', []),
            reading=spot_data.get('reading') or None,
            url=spot_data.get('url') or None,
            quizzes=quizzes,
            # MCP用付加情報
            address=spot_data.get('address') or None,
            short_description=spot_data.get('short_description') or None,
            category=spot_data.get('category') or None,
            tags=spot_data.get('tags') or [],
            opening_hours=spot_data.get('opening_hours') or None,
            access_info=spot_data.get('access_info') or None,
            historical_period=spot_data.get('historical_period') or None,
            wikipedia_url=spot_data.get('wikipedia_url') or None,
            estimated_visit_time=spot_data.get('estimated_visit_time') or None,
            admission=spot_data.get('admission') or None,
            works=spot_data.get('works') or [],
            shooting_tips=spot_data.get('shooting_tips') or None,
            visit_notes=spot_data.get('visit_notes') or None,
            is_official=spot_data.get('is_official'),
            pilgrimage_difficulty=spot_data.get('pilgrimage_difficulty') or None,
            scene_season=spot_data.get('scene_season') or None,
            member_icon=spot_data.get('member_icon') or None,
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
        spot.areas = spot_data.get('areas', spot.areas)
        if 'reading' in spot_data:
            spot.reading = spot_data['reading'] or None
        if 'url' in spot_data:
            spot.url = spot_data['url'] or None
        if 'quizzes' in spot_data:
            spot.quizzes = spot_data['quizzes'] or []
        # MCP用付加情報
        if 'address' in spot_data:
            spot.address = spot_data['address'] or None
        if 'short_description' in spot_data:
            spot.short_description = spot_data['short_description'] or None
        if 'category' in spot_data:
            spot.category = spot_data['category'] or None
        if 'tags' in spot_data:
            spot.tags = spot_data['tags'] or []
        if 'opening_hours' in spot_data:
            spot.opening_hours = spot_data['opening_hours'] or None
        if 'access_info' in spot_data:
            spot.access_info = spot_data['access_info'] or None
        if 'historical_period' in spot_data:
            spot.historical_period = spot_data['historical_period'] or None
        if 'wikipedia_url' in spot_data:
            spot.wikipedia_url = spot_data['wikipedia_url'] or None
        if 'estimated_visit_time' in spot_data:
            spot.estimated_visit_time = spot_data['estimated_visit_time'] or None
        if 'admission' in spot_data:
            spot.admission = spot_data['admission'] or None
        if 'works' in spot_data:
            spot.works = spot_data['works'] or []
        if 'shooting_tips' in spot_data:
            spot.shooting_tips = spot_data['shooting_tips'] or None
        if 'visit_notes' in spot_data:
            spot.visit_notes = spot_data['visit_notes'] or None
        if 'is_official' in spot_data:
            spot.is_official = spot_data['is_official']
        if 'pilgrimage_difficulty' in spot_data:
            spot.pilgrimage_difficulty = spot_data['pilgrimage_difficulty'] or None
        if 'scene_season' in spot_data:
            spot.scene_season = spot_data['scene_season'] or None
        if 'member_icon' in spot_data:
            spot.member_icon = spot_data['member_icon'] or None

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
    def _parse_stats_date(value: Optional[str]) -> Optional[str]:
        """期間指定の日付（YYYY-MM-DD）を検証する。未指定は None"""
        if not value:
            return None
        try:
            return datetime.strptime(value, '%Y-%m-%d').date().isoformat()
        except ValueError:
            raise ValueError('INVALID_DATE')

    @staticmethod
    def _jst_date(value: Optional[str]) -> Optional[str]:
        """保存されている日時（UTC）を日本時間の日付にする。読めない値は None"""
        if not value:
            return None
        try:
            return _parse_utc(value).astimezone(JST).date().isoformat()
        except ValueError:
            return None

    @staticmethod
    def _scan_all(table, projection: str) -> List[Dict]:
        """テーブルを最後までスキャンする"""
        scan = {'ProjectionExpression': projection}
        items: List[Dict] = []
        while True:
            response = table.scan(**scan)
            items.extend(response.get('Items', []))
            last_key = response.get('LastEvaluatedKey')
            if not last_key:
                return items
            scan['ExclusiveStartKey'] = last_key

    @staticmethod
    def get_stats(date_from: Optional[str] = None, date_to: Optional[str] = None) -> Dict:
        """ユーザー統計を取得する

        期間は日本時間の日付で、両端を含む。from を省くと最初のデータから、to を省くと今日まで。
        total_users だけは期間によらず全ユーザー数を返す
        """
        from utils.dynamodb import get_table

        date_from = AdminService._parse_stats_date(date_from)
        date_to = AdminService._parse_stats_date(date_to)

        today = datetime.now(JST).date().isoformat()
        end = min(date_to or today, today)
        if date_from and date_from > end:
            raise ValueError('INVALID_DATE_RANGE')

        user_items = AdminService._scan_all(get_table(config.USERS_TABLE), 'created_at')
        checkin_items = AdminService._scan_all(
            get_table(config.CHECKINS_TABLE),
            'user_id, spot_id, checked_in_at, quiz_answered, quiz_correct'
        )

        user_dates = [AdminService._jst_date(item.get('created_at')) for item in user_items]
        checkins = [(AdminService._jst_date(item.get('checked_in_at')), item) for item in checkin_items]

        # 最初のデータより前は数えるものがないので、日別の一覧に含めない
        earliest = min(
            [d for d in user_dates if d] + [d for d, _ in checkins if d],
            default=today
        )
        start = max(date_from or earliest, earliest)

        daily_new_users_map: Dict[str, int] = collections.defaultdict(int)
        for date in user_dates:
            if date and start <= date <= end:
                daily_new_users_map[date] += 1

        daily_active_map: Dict[str, set] = collections.defaultdict(set)
        active_users: set = set()
        spot_checkin_counts: Dict[str, int] = collections.defaultdict(int)
        spot_quiz_answered: Dict[str, int] = collections.defaultdict(int)
        spot_quiz_correct: Dict[str, int] = collections.defaultdict(int)

        for date, item in checkins:
            if not date or not start <= date <= end:
                continue
            user_id = item.get('user_id', '')
            if user_id:
                daily_active_map[date].add(user_id)
                active_users.add(user_id)
            sid = item.get('spot_id', '')
            if not sid:
                continue
            spot_checkin_counts[sid] += 1
            if item.get('quiz_answered'):
                spot_quiz_answered[sid] += 1
            if item.get('quiz_correct'):
                spot_quiz_correct[sid] += 1

        # 期間内の日付リスト（昇順）
        dates: List[str] = []
        current = datetime.strptime(start, '%Y-%m-%d').date()
        last = datetime.strptime(end, '%Y-%m-%d').date()
        while current <= last:
            dates.append(current.isoformat())
            current += timedelta(days=1)

        # スポット名マップを取得
        from models.spot import Spot as SpotModel
        all_spots = SpotModel.get_all()
        spot_name_map = {s.spot_id: s.spot_name for s in all_spots}

        # チェックインが多いスポット TOP10
        top_checkin_spots = sorted(
            [
                {
                    'spot_id': sid,
                    'spot_name': spot_name_map.get(sid, sid),
                    'count': cnt,
                }
                for sid, cnt in spot_checkin_counts.items()
            ],
            key=lambda x: x['count'],
            reverse=True
        )[:10]

        # クイズ正解率ランキング（最低3回以上回答したスポットのみ）
        MIN_QUIZ_ANSWERS = 3
        quiz_rate_entries = [
            {
                'spot_id': sid,
                'spot_name': spot_name_map.get(sid, sid),
                'answered': spot_quiz_answered[sid],
                'correct': spot_quiz_correct[sid],
                'rate': round(spot_quiz_correct[sid] / spot_quiz_answered[sid] * 100, 1),
            }
            for sid in spot_quiz_answered
            if spot_quiz_answered[sid] >= MIN_QUIZ_ANSWERS
        ]

        top_quiz_correct_spots = sorted(quiz_rate_entries, key=lambda x: x['rate'], reverse=True)[:10]
        low_quiz_correct_spots = sorted(quiz_rate_entries, key=lambda x: x['rate'])[:10]

        return {
            'period': {'from': start, 'to': end},
            'total_users': len(user_items),
            'active_users': len(active_users),
            'new_users': sum(daily_new_users_map.values()),
            'daily_new_users': [
                {'date': d, 'count': daily_new_users_map.get(d, 0)} for d in dates
            ],
            'daily_active_users': [
                {'date': d, 'count': len(daily_active_map.get(d, set()))} for d in dates
            ],
            'top_checkin_spots': top_checkin_spots,
            'top_quiz_correct_spots': top_quiz_correct_spots,
            'low_quiz_correct_spots': low_quiz_correct_spots,
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