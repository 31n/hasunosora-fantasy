from datetime import datetime
from typing import Optional, Dict, List
from decimal import Decimal
from utils.dynamodb import get_table
from config import config

class Area:
    def __init__(self, area_id: str, area_name: str, 
                 center_latitude: float, center_longitude: float,
                 display_order: int = 0, is_active: bool = True,
                 available_genres: List[str] = None,
                 restricted_genres: Optional[Dict[str, Dict]] = None,
                 created_at: Optional[str] = None, updated_at: Optional[str] = None):
        self.area_id = area_id
        self.area_name = area_name
        # Decimal型をfloatに変換
        self.center_latitude = float(center_latitude) if isinstance(center_latitude, Decimal) else center_latitude
        self.center_longitude = float(center_longitude) if isinstance(center_longitude, Decimal) else center_longitude
        self.display_order = int(display_order) if isinstance(display_order, Decimal) else display_order
        self.is_active = bool(is_active)
        self.available_genres = available_genres or []
        self.restricted_genres = restricted_genres or {}  # {"genre_name": {"access_code": "CODE123", "is_restricted": true}}
        self.created_at = created_at or datetime.utcnow().isoformat()
        self.updated_at = updated_at or datetime.utcnow().isoformat()
    
    def to_dict(self, for_dynamodb: bool = False) -> Dict:
        """
        辞書形式に変換
        
        Args:
            for_dynamodb: TrueならDynamoDB用にDecimalに変換、FalseならAPI用にfloat/intに変換
        """
        if for_dynamodb:
            # DynamoDB保存用
            return {
                'area_id': self.area_id,
                'area_name': self.area_name,
                'center_latitude': Decimal(str(self.center_latitude)),
                'center_longitude': Decimal(str(self.center_longitude)),
                'display_order': self.display_order,
                'is_active': self.is_active,
                'available_genres': self.available_genres,
                'restricted_genres': self.restricted_genres,
                'created_at': self.created_at,
                'updated_at': self.updated_at
            }
        else:
            # API用
            return {
                'area_id': self.area_id,
                'area_name': self.area_name,
                'center_latitude': self.center_latitude,
                'center_longitude': self.center_longitude,
                'display_order': self.display_order,
                'is_active': self.is_active,
                'available_genres': self.available_genres,
                'restricted_genres': self.restricted_genres,
                'created_at': self.created_at,
                'updated_at': self.updated_at
            }
    
    def save(self):
        """DynamoDBに保存"""
        self.updated_at = datetime.utcnow().isoformat()
        table = get_table(config.AREAS_TABLE)
        table.put_item(Item=self.to_dict(for_dynamodb=True))
    
    @staticmethod
    def get(area_id: str) -> Optional['Area']:
        """エリアIDからエリアを取得"""
        table = get_table(config.AREAS_TABLE)
        response = table.get_item(Key={'area_id': area_id})
        
        if 'Item' not in response:
            return None
        
        item = response['Item']
        return Area(
            area_id=item['area_id'],
            area_name=item['area_name'],
            center_latitude=item['center_latitude'],
            center_longitude=item['center_longitude'],
            display_order=item.get('display_order', 0),
            is_active=item.get('is_active', True),
            available_genres=item.get('available_genres', []),
            restricted_genres=item.get('restricted_genres', {}),
            created_at=item.get('created_at'),
            updated_at=item.get('updated_at')
        )
    
    @staticmethod
    def get_all(include_inactive: bool = False) -> List['Area']:
        """全エリアを取得"""
        table = get_table(config.AREAS_TABLE)
        response = table.scan()
        
        areas = []
        for item in response.get('Items', []):
            area = Area(
                area_id=item['area_id'],
                area_name=item['area_name'],
                center_latitude=item['center_latitude'],
                center_longitude=item['center_longitude'],
                display_order=item.get('display_order', 0),
                is_active=item.get('is_active', True),
                available_genres=item.get('available_genres', []),
                restricted_genres=item.get('restricted_genres', {}),
                created_at=item.get('created_at'),
                updated_at=item.get('updated_at')
            )
            
            # is_activeフィルタリング
            if include_inactive or area.is_active:
                areas.append(area)
        
        # display_orderでソート
        areas.sort(key=lambda x: x.display_order)
        
        return areas
    
    @staticmethod
    def delete(area_id: str):
        """エリアを論理削除（is_active=Falseに設定）"""
        area = Area.get(area_id)
        if not area:
            raise ValueError('AREA_NOT_FOUND')
        
        area.is_active = False
        area.save()
    
    @staticmethod
    def get_master_version() -> Dict:
        """エリアマスターのバージョン情報を取得"""
        # エリアの最終更新日時を取得
        areas = Area.get_all(include_inactive=True)
        
        if not areas:
            version = datetime.utcnow().strftime('%Y%m%d')
        else:
            # 最も新しいupdated_atを取得
            latest_updated = max(area.updated_at for area in areas)
            version = datetime.fromisoformat(latest_updated).strftime('%Y%m%d%H%M%S')
        
        return {
            'version': version,
            'updated_at': datetime.utcnow().isoformat()
        }
