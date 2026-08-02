from datetime import datetime, timezone
from typing import List, Dict, Optional
from decimal import Decimal
import uuid
from utils.dynamodb import get_table
from config import config


def _normalize_quiz(q: Dict) -> Dict:
    """DynamoDB の Decimal を int に変換し、quiz_type_id を保持する"""
    return {
        'quiz_type_id': q.get('quiz_type_id'),  # None = デフォルト
        'question': q.get('question', ''),
        'question_image': q.get('question_image') or None,  # 問題画像URL（任意）
        'choices': q.get('choices', []),
        'correct_answer': int(q['correct_answer']) if isinstance(q.get('correct_answer'), Decimal) else q.get('correct_answer', 0),
        'score': int(q['score']) if isinstance(q.get('score'), Decimal) else q.get('score', 0),
    }


def _quiz_to_dynamodb(q: Dict) -> Dict:
    """クイズを DynamoDB 保存形式に変換（Decimal）"""
    result = {
        'quiz_type_id': q.get('quiz_type_id'),
        'question': q.get('question', ''),
        'choices': q.get('choices', []),
        'correct_answer': Decimal(str(q.get('correct_answer', 0))),
        'score': Decimal(str(q.get('score', 0))),
    }
    if q.get('question_image'):
        result['question_image'] = q['question_image']
    return result


def _migrate_legacy_quizzes(item: Dict) -> List[Dict]:
    """
    旧形式 (quiz: Dict) を新形式 (quizzes: List[Dict]) に自動移行。
    既に quizzes が存在する場合はそちらを使用する。
    """
    if 'quizzes' in item and item['quizzes']:
        return [_normalize_quiz(q) for q in item['quizzes']]
    if 'quiz' in item and item['quiz']:
        old = item['quiz']
        return [_normalize_quiz({**old, 'quiz_type_id': None})]
    return []


def _normalize_work(w: Dict) -> Dict:
    """MCP用作品情報: DynamoDB の Decimal を int に変換"""
    result = dict(w)
    if isinstance(result.get('air_year'), Decimal):
        result['air_year'] = int(result['air_year'])
    return result


def _work_to_dynamodb(w: Dict) -> Dict:
    """MCP用作品情報を DynamoDB 保存形式に変換"""
    result = {k: v for k, v in w.items() if v is not None}
    if 'air_year' in result:
        result['air_year'] = Decimal(str(result['air_year']))
    return result


class Spot:
    def __init__(self, spot_id: Optional[str] = None, spot_name: str = "",
                 description: str = "", latitude: float = 0.0, longitude: float = 0.0,
                 detection_radius: float = 100.0, images: List[str] = None,
                 genre: List[str] = None,
                 quizzes: Optional[List[Dict]] = None,
                 areas: Optional[List[str]] = None,
                 reading: Optional[str] = None, url: Optional[str] = None,
                 version: str = "", created_at: Optional[str] = None, updated_at: Optional[str] = None,
                 # MCP用付加情報（任意）
                 address: Optional[str] = None,
                 short_description: Optional[str] = None,
                 category: Optional[str] = None,
                 tags: Optional[List[str]] = None,
                 opening_hours: Optional[str] = None,
                 access_info: Optional[str] = None,
                 historical_period: Optional[str] = None,
                 wikipedia_url: Optional[str] = None,
                 estimated_visit_time: Optional[str] = None,
                 admission: Optional[str] = None,
                 works: Optional[List[Dict]] = None,
                 shooting_tips: Optional[str] = None,
                 visit_notes: Optional[str] = None,
                 is_official: Optional[bool] = None,
                 pilgrimage_difficulty: Optional[str] = None,
                 scene_season: Optional[str] = None,
                 member_icon: Optional[str] = None):
        self.spot_id = spot_id or str(uuid.uuid4())
        self.spot_name = spot_name
        self.description = description
        # Decimal型をfloatに変換
        self.latitude = float(latitude) if isinstance(latitude, Decimal) else latitude
        self.longitude = float(longitude) if isinstance(longitude, Decimal) else longitude
        self.detection_radius = float(detection_radius) if isinstance(detection_radius, Decimal) else detection_radius
        self.images = images or []
        self.genre = genre or []
        self.quizzes: List[Dict] = quizzes or []  # クイズタイプ別クイズリスト
        self.areas: List[str] = areas or []  # エリアIDリスト
        self.reading = reading  # ふりがな（nullable）
        self.url = url  # 外部リンクURL（nullable）
        self.version = version or datetime.utcnow().strftime('%Y%m%d')
        # MCP用付加情報（任意）既存動作に影響しない
        self.address = address
        self.short_description = short_description
        self.category = category
        self.tags: List[str] = tags or []
        self.opening_hours = opening_hours
        self.access_info = access_info
        self.historical_period = historical_period
        self.wikipedia_url = wikipedia_url
        self.estimated_visit_time = estimated_visit_time
        self.admission = admission
        self.works: List[Dict] = works or []
        self.shooting_tips = shooting_tips
        self.visit_notes = visit_notes
        self.is_official = is_official
        self.pilgrimage_difficulty = pilgrimage_difficulty
        self.scene_season = scene_season
        self.member_icon = member_icon
        self.created_at = created_at or datetime.now(timezone.utc).isoformat()
        self.updated_at = updated_at or datetime.now(timezone.utc).isoformat()

    def get_quiz_for_type(
        self,
        quiz_type_id: Optional[str],
        allowed_quiz_type_ids: Optional[set] = None,
    ) -> Optional[Dict]:
        """
        ユーザーの selected_quiz_type に対応するクイズを返す。

        Args:
            quiz_type_id: ユーザーの選択クイズタイプID（None = デフォルト）
            allowed_quiz_type_ids: 表示を許可するクイズタイプIDのセット。
                Noneの場合は制限なし。quiz_type_id=None（デフォルト）は常に許可。
        """
        if not self.quizzes:
            return None

        # display_order 制限フィルタ（quiz_type_id=None のデフォルトクイズは常に許可）
        if allowed_quiz_type_ids is not None:
            available = [
                q for q in self.quizzes
                if q.get('quiz_type_id') is None
                or q.get('quiz_type_id') in allowed_quiz_type_ids
            ]
        else:
            available = self.quizzes

        if not available:
            return None

        # 指定タイプを検索
        for q in available:
            if q.get('quiz_type_id') == quiz_type_id:
                return q
        # 見つからなければデフォルト（quiz_type_id=None）を返す
        for q in available:
            if q.get('quiz_type_id') is None:
                return q
        # デフォルトも存在しない場合は先頭のクイズにフォールバック
        return available[0]
    
    def to_dict(self, for_dynamodb: bool = False) -> Dict:
        """
        辞書形式に変換

        Args:
            for_dynamodb: TrueならDynamoDB用にDecimalに変換、FalseならAPI用にfloat/intに変換
        """
        if for_dynamodb:
            result = {
                'spot_id': self.spot_id,
                'spot_name': self.spot_name,
                'description': self.description,
                'latitude': Decimal(str(self.latitude)),
                'longitude': Decimal(str(self.longitude)),
                'detection_radius': Decimal(str(self.detection_radius)),
                'images': self.images,
                'genre': self.genre,
                'areas': self.areas,
                'reading': self.reading,
                'url': self.url,
                'version': self.version,
                'created_at': self.created_at,
                'updated_at': self.updated_at,
                # MCP用付加情報
                'address': self.address,
                'short_description': self.short_description,
                'category': self.category,
                'tags': self.tags,
                'opening_hours': self.opening_hours,
                'access_info': self.access_info,
                'historical_period': self.historical_period,
                'wikipedia_url': self.wikipedia_url,
                'estimated_visit_time': self.estimated_visit_time,
                'admission': self.admission,
                'shooting_tips': self.shooting_tips,
                'visit_notes': self.visit_notes,
                'is_official': self.is_official,
                'pilgrimage_difficulty': self.pilgrimage_difficulty,
                'scene_season': self.scene_season,
                'member_icon': self.member_icon,
            }
            if self.quizzes:
                result['quizzes'] = [_quiz_to_dynamodb(q) for q in self.quizzes]
            if self.works:
                result['works'] = [_work_to_dynamodb(w) for w in self.works]
        else:
            result = {
                'spot_id': self.spot_id,
                'spot_name': self.spot_name,
                'description': self.description,
                'latitude': float(self.latitude),
                'longitude': float(self.longitude),
                'detection_radius': float(self.detection_radius),
                'images': self.images,
                'genre': self.genre,
                'areas': self.areas,
                'reading': self.reading,
                'url': self.url,
                'version': self.version,
                'created_at': self.created_at,
                'updated_at': self.updated_at,
                'quizzes': self.quizzes,
                # MCP用付加情報
                'address': self.address,
                'short_description': self.short_description,
                'category': self.category,
                'tags': self.tags,
                'opening_hours': self.opening_hours,
                'access_info': self.access_info,
                'historical_period': self.historical_period,
                'wikipedia_url': self.wikipedia_url,
                'estimated_visit_time': self.estimated_visit_time,
                'admission': self.admission,
                'works': self.works,
                'shooting_tips': self.shooting_tips,
                'visit_notes': self.visit_notes,
                'is_official': self.is_official,
                'pilgrimage_difficulty': self.pilgrimage_difficulty,
                'scene_season': self.scene_season,
                'member_icon': self.member_icon,
            }
        return result

    def save(self):
        """DynamoDBに保存"""
        self.updated_at = datetime.now(timezone.utc).isoformat()
        self.version = datetime.now(timezone.utc).strftime('%Y%m%d')

        table = get_table(config.SPOTS_TABLE)
        table.put_item(Item=self.to_dict(for_dynamodb=True))
        self._update_master_version()

    def delete(self):
        """DynamoDBから削除"""
        table = get_table(config.SPOTS_TABLE)
        table.delete_item(Key={'spot_id': self.spot_id})
        self._update_master_version()

    @staticmethod
    def _build_from_item(item: Dict) -> 'Spot':
        """DynamoDB のアイテムから Spot インスタンスを生成（旧フォーマット自動移行）"""
        quizzes = _migrate_legacy_quizzes(item)
        raw_works = item.get('works', [])
        works = [_normalize_work(w) for w in raw_works] if raw_works else []
        # マイグレーション: 旧 area (str) → 新 areas (list)
        if 'areas' in item:
            areas = list(item['areas'])
        elif item.get('area'):
            areas = [item['area']]
        else:
            areas = []
        return Spot(
            spot_id=item['spot_id'],
            spot_name=item['spot_name'],
            description=item['description'],
            latitude=float(item['latitude']),
            longitude=float(item['longitude']),
            detection_radius=float(item['detection_radius']),
            images=item.get('images', []),
            genre=item.get('genre', []),
            quizzes=quizzes,
            areas=areas,
            reading=item.get('reading'),
            url=item.get('url'),
            version=item.get('version', ''),
            created_at=item.get('created_at'),
            updated_at=item.get('updated_at'),
            # MCP用付加情報
            address=item.get('address'),
            short_description=item.get('short_description'),
            category=item.get('category'),
            tags=item.get('tags', []),
            opening_hours=item.get('opening_hours'),
            access_info=item.get('access_info'),
            historical_period=item.get('historical_period'),
            wikipedia_url=item.get('wikipedia_url'),
            estimated_visit_time=item.get('estimated_visit_time'),
            admission=item.get('admission'),
            works=works,
            shooting_tips=item.get('shooting_tips'),
            visit_notes=item.get('visit_notes'),
            is_official=item.get('is_official'),
            pilgrimage_difficulty=item.get('pilgrimage_difficulty'),
            scene_season=item.get('scene_season'),
            member_icon=item.get('member_icon'),
        )

    @staticmethod
    def get(spot_id: str) -> Optional['Spot']:
        """スポットIDからスポットを取得"""
        table = get_table(config.SPOTS_TABLE)
        response = table.get_item(Key={'spot_id': spot_id})
        if 'Item' not in response:
            return None
        return Spot._build_from_item(response['Item'])

    @staticmethod
    def get_all() -> List['Spot']:
        """全スポットを取得"""
        table = get_table(config.SPOTS_TABLE)
        response = table.scan()
        return [Spot._build_from_item(item) for item in response.get('Items', [])]

    @staticmethod
    def _update_master_version():
        """マスターバージョンを更新"""
        table = get_table(config.MASTER_VERSION_TABLE)
        current_version = datetime.now(timezone.utc).strftime('%Y%m%d')
        table.put_item(Item={
            'id': 'current',
            'version': current_version,
            'updated_at': datetime.now(timezone.utc).isoformat()
        })

    @staticmethod
    def get_master_version() -> Dict:
        """現在のマスターバージョンを取得"""
        table = get_table(config.MASTER_VERSION_TABLE)
        response = table.get_item(Key={'id': 'current'})

        if 'Item' in response:
            return {
                'version': response['Item']['version'],
                'updated_at': response['Item']['updated_at']
            }

        current_version = datetime.now(timezone.utc).strftime('%Y%m%d')
        return {
            'version': current_version,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }