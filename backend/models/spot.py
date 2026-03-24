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
        'choices': q.get('choices', []),
        'correct_answer': int(q['correct_answer']) if isinstance(q.get('correct_answer'), Decimal) else q.get('correct_answer', 0),
        'score': int(q['score']) if isinstance(q.get('score'), Decimal) else q.get('score', 0),
    }


def _quiz_to_dynamodb(q: Dict) -> Dict:
    """クイズを DynamoDB 保存形式に変換（Decimal）"""
    return {
        'quiz_type_id': q.get('quiz_type_id'),
        'question': q.get('question', ''),
        'choices': q.get('choices', []),
        'correct_answer': Decimal(str(q.get('correct_answer', 0))),
        'score': Decimal(str(q.get('score', 0))),
    }


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


class Spot:
    def __init__(self, spot_id: Optional[str] = None, spot_name: str = "",
                 description: str = "", latitude: float = 0.0, longitude: float = 0.0,
                 detection_radius: float = 100.0, images: List[str] = None,
                 genre: List[str] = None,
                 quizzes: Optional[List[Dict]] = None,
                 area: Optional[str] = None,
                 reading: Optional[str] = None, url: Optional[str] = None,
                 version: str = "", created_at: Optional[str] = None, updated_at: Optional[str] = None):
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
        self.area = area  # エリアID（nullable）
        self.reading = reading  # ふりがな（nullable）
        self.url = url  # 外部リンクURL（nullable）
        self.version = version or datetime.utcnow().strftime('%Y%m%d')
        self.created_at = created_at or datetime.now(timezone.utc).isoformat()
        self.updated_at = updated_at or datetime.now(timezone.utc).isoformat()

    def get_quiz_for_type(self, quiz_type_id: Optional[str]) -> Optional[Dict]:
        """
        ユーザーの selected_quiz_type に対応するクイズを返す。
        該当タイプが存在しない場合は quiz_type_id=None のデフォルトクイズを返す。
        """
        if not self.quizzes:
            return None
        # 指定タイプを検索
        for q in self.quizzes:
            if q.get('quiz_type_id') == quiz_type_id:
                return q
        # 見つからなければデフォルト（quiz_type_id=None）を返す
        for q in self.quizzes:
            if q.get('quiz_type_id') is None:
                return q
        return None
    
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
                'area': self.area,
                'reading': self.reading,
                'url': self.url,
                'version': self.version,
                'created_at': self.created_at,
                'updated_at': self.updated_at,
            }
            if self.quizzes:
                result['quizzes'] = [_quiz_to_dynamodb(q) for q in self.quizzes]
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
                'area': self.area,
                'reading': self.reading,
                'url': self.url,
                'version': self.version,
                'created_at': self.created_at,
                'updated_at': self.updated_at,
                'quizzes': self.quizzes,
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
            area=item.get('area'),
            reading=item.get('reading'),
            url=item.get('url'),
            version=item.get('version', ''),
            created_at=item.get('created_at'),
            updated_at=item.get('updated_at'),
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