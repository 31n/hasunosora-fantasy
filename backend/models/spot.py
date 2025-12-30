from datetime import datetime
from typing import List, Dict, Optional
import uuid
from utils.dynamodb import get_table
from config import config

class Spot:
    def __init__(self, spot_id: Optional[str] = None, spot_name: str = "", 
                 description: str = "", latitude: float = 0.0, longitude: float = 0.0,
                 detection_radius: float = 100.0, images: List[str] = None,
                 quiz: Dict = None, version: str = "", 
                 created_at: Optional[str] = None, updated_at: Optional[str] = None):
        self.spot_id = spot_id or str(uuid.uuid4())
        self.spot_name = spot_name
        self.description = description
        self.latitude = latitude
        self.longitude = longitude
        self.detection_radius = detection_radius
        self.images = images or []
        self.quiz = quiz or {}
        self.version = version or datetime.utcnow().strftime('%Y%m%d')
        self.created_at = created_at or datetime.utcnow().isoformat()
        self.updated_at = updated_at or datetime.utcnow().isoformat()
    
    def to_dict(self) -> Dict:
        """辞書形式に変換"""
        return {
            'spot_id': self.spot_id,
            'spot_name': self.spot_name,
            'description': self.description,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'detection_radius': self.detection_radius,
            'images': self.images,
            'quiz': self.quiz,
            'version': self.version,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    def save(self):
        """DynamoDBに保存"""
        self.updated_at = datetime.utcnow().isoformat()
        self.version = datetime.utcnow().strftime('%Y%m%d')
        
        table = get_table(config.SPOTS_TABLE)
        table.put_item(Item=self.to_dict())
        
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
        return Spot(
            spot_id=item['spot_id'],
            spot_name=item['spot_name'],
            description=item['description'],
            latitude=float(item['latitude']),
            longitude=float(item['longitude']),
            detection_radius=float(item['detection_radius']),
            images=item.get('images', []),
            quiz=item.get('quiz', {}),
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
            spots.append(Spot(
                spot_id=item['spot_id'],
                spot_name=item['spot_name'],
                description=item['description'],
                latitude=float(item['latitude']),
                longitude=float(item['longitude']),
                detection_radius=float(item['detection_radius']),
                images=item.get('images', []),
                quiz=item.get('quiz', {}),
                version=item.get('version', ''),
                created_at=item.get('created_at'),
                updated_at=item.get('updated_at')
            ))
        
        return spots
    
    @staticmethod
    def _update_master_version():
        """マスターバージョンを更新"""
        table = get_table(config.MASTER_VERSION_TABLE)
        current_version = datetime.utcnow().strftime('%Y%m%d')
        
        table.put_item(Item={
            'id': 'current',
            'version': current_version,
            'updated_at': datetime.utcnow().isoformat()
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
        current_version = datetime.utcnow().strftime('%Y%m%d')
        return {
            'version': current_version,
            'updated_at': datetime.utcnow().isoformat()
        }
