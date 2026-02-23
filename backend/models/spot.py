from datetime import datetime, timezone
from typing import List, Dict, Optional
from decimal import Decimal
import uuid
from utils.dynamodb import get_table
from config import config

class Spot:
    def __init__(self, spot_id: Optional[str] = None, spot_name: str = "", 
                 description: str = "", latitude: float = 0.0, longitude: float = 0.0,
                 detection_radius: float = 100.0, images: List[str] = None,
                 genre: List[str] = None, quiz: Optional[Dict] = None, area: Optional[str] = None,
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
        self.quiz = quiz  # Noneも許可
        self.area = area  # エリアID（nullable）
        self.version = version or datetime.utcnow().strftime('%Y%m%d')
        self.created_at = created_at or datetime.now(timezone.utc).isoformat()
        self.updated_at = updated_at or datetime.now(timezone.utc).isoformat()
    
    def to_dict(self, for_dynamodb: bool = False) -> Dict:
        """
        辞書形式に変換
        
        Args:
            for_dynamodb: TrueならDynamoDB用にDecimalに変換、FalseならAPI用にfloat/intに変換
        """
        if for_dynamodb:
            # DynamoDB保存用（floatをDecimalに変換）
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
                'version': self.version,
                'created_at': self.created_at,
                'updated_at': self.updated_at
            }
            
            # クイズがある場合のみ追加（Decimalに変換）
            if self.quiz:
                result['quiz'] = self._convert_quiz_to_decimals(self.quiz)
        else:
            # API応答用（すべてfloat/intに変換）
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
                'version': self.version,
                'created_at': self.created_at,
                'updated_at': self.updated_at
            }
            
            # クイズがある場合のみ追加（int/floatに変換）
            if self.quiz:
                result['quiz'] = self._convert_quiz_to_primitives(self.quiz)
        
        return result
    
    def _convert_quiz_to_decimals(self, quiz: Dict) -> Dict:
        """QuizのintをDecimal型に変換（DynamoDB保存用）"""
        if not quiz:
            return {}
        
        converted = quiz.copy()
        if 'score' in converted:
            converted['score'] = Decimal(str(converted['score']))
        if 'correct_answer' in converted:
            converted['correct_answer'] = Decimal(str(converted['correct_answer']))
        return converted
    
    def _convert_quiz_to_primitives(self, quiz: Dict) -> Dict:
        """QuizのDecimal型をint/floatに変換（API応答用）"""
        if not quiz:
            return {}
        
        converted = quiz.copy()
        if 'score' in converted:
            if isinstance(converted['score'], Decimal):
                converted['score'] = int(converted['score'])
        if 'correct_answer' in converted:
            if isinstance(converted['correct_answer'], Decimal):
                converted['correct_answer'] = int(converted['correct_answer'])
        return converted
    
    def save(self):
        """DynamoDBに保存"""
        self.updated_at = datetime.now(timezone.utc).isoformat()
        self.version = datetime.now(timezone.utc).strftime('%Y%m%d')
        
        table = get_table(config.SPOTS_TABLE)
        # DynamoDB用に変換して保存
        table.put_item(Item=self.to_dict(for_dynamodb=True))
        
        # マスターバージョンを更新
        self._update_master_version()
    
    def delete(self):
        """DynamoDBから削除"""
        table = get_table(config.SPOTS_TABLE)
        table.delete_item(Key={'spot_id': self.spot_id})
        
        # マスターバージョンを更新
        self._update_master_version()
    
    @staticmethod
    def get(spot_id: str) -> Optional['Spot']:
        """スポットIDからスポットを取得"""
        table = get_table(config.SPOTS_TABLE)
        response = table.get_item(Key={'spot_id': spot_id})
        
        if 'Item' not in response:
            return None
        
        item = response['Item']
        
        # クイズがある場合はDecimalをintに変換
        quiz = item.get('quiz')
        if quiz:
            quiz = {
                'question': quiz.get('question'),
                'choices': quiz.get('choices'),
                'correct_answer': int(quiz.get('correct_answer', 0)) if isinstance(quiz.get('correct_answer'), Decimal) else quiz.get('correct_answer', 0),
                'score': int(quiz.get('score', 0)) if isinstance(quiz.get('score'), Decimal) else quiz.get('score', 0)
            }
        
        return Spot(
            spot_id=item['spot_id'],
            spot_name=item['spot_name'],
            description=item['description'],
            latitude=float(item['latitude']),
            longitude=float(item['longitude']),
            detection_radius=float(item['detection_radius']),
            images=item.get('images', []),
            genre=item.get('genre', ''),
            quiz=quiz,
            area=item.get('area'),
            version=item.get('version', ''),
            created_at=item.get('created_at'),
            updated_at=item.get('updated_at')
        )
    
    @staticmethod
    def get_all() -> List['Spot']:
        """全スポットを取得"""
        table = get_table(config.SPOTS_TABLE)
        response = table.scan()
        
        spots = []
        for item in response.get('Items', []):
            # クイズがある場合はDecimalをintに変換
            quiz = item.get('quiz')
            if quiz:
                quiz = {
                    'question': quiz.get('question'),
                    'choices': quiz.get('choices'),
                    'correct_answer': int(quiz.get('correct_answer', 0)) if isinstance(quiz.get('correct_answer'), Decimal) else quiz.get('correct_answer', 0),
                    'score': int(quiz.get('score', 0)) if isinstance(quiz.get('score'), Decimal) else quiz.get('score', 0)
                }
            
            spots.append(Spot(
                spot_id=item['spot_id'],
                spot_name=item['spot_name'],
                description=item['description'],
                latitude=float(item['latitude']),
                longitude=float(item['longitude']),
                detection_radius=float(item['detection_radius']),
                images=item.get('images', []),
                genre=item.get('genre', ''),
                quiz=quiz,
                area=item.get('area'),
                version=item.get('version', ''),
                created_at=item.get('created_at'),
                updated_at=item.get('updated_at')
            ))
        
        return spots
    
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
        
        # 初回は現在日付を返す
        current_version = datetime.now(timezone.utc).strftime('%Y%m%d')
        return {
            'version': current_version,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }