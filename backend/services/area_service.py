from models.area import Area
from typing import Dict, List

class AreaService:
    @staticmethod
    def get_all_areas(include_inactive: bool = False) -> List[Dict]:
        """全エリアを取得"""
        areas = Area.get_all(include_inactive=include_inactive)
        return [area.to_dict(for_dynamodb=False) for area in areas]
    
    @staticmethod
    def get_area(area_id: str) -> Dict:
        """特定のエリアを取得"""
        area = Area.get(area_id)
        
        if not area:
            raise ValueError('AREA_NOT_FOUND')
        
        if not area.is_active:
            raise ValueError('AREA_INACTIVE')
        
        return area.to_dict(for_dynamodb=False)
    
    @staticmethod
    def create_area(area_id: str, area_name: str, center_latitude: float, 
                   center_longitude: float, display_order: int = 0,
                   available_genres: List[str] = None,
                   is_restricted: bool = False,
                   access_code: str = None,
                   area_type: str = 'normal',
                   start_date: str = None,
                   end_date: str = None,
                   external_url: str = None,
                   description: str = None) -> Dict:
        """新しいエリアを作成"""
        # 既存チェック
        existing = Area.get(area_id)
        if existing:
            raise ValueError('AREA_ALREADY_EXISTS')
        
        area = Area(
            area_id=area_id,
            area_name=area_name,
            center_latitude=center_latitude,
            center_longitude=center_longitude,
            display_order=display_order,
            available_genres=available_genres or [],
            is_restricted=is_restricted,
            access_code=access_code,
            area_type=area_type,
            start_date=start_date,
            end_date=end_date,
            external_url=external_url,
            description=description,
            is_active=True
        )
        area.save()
        
        return area.to_dict(for_dynamodb=False)
    
    @staticmethod
    def update_area(area_id: str, area_name: str = None, center_latitude: float = None,
                   center_longitude: float = None, display_order: int = None,
                   is_active: bool = None, available_genres: List[str] = None,
                   is_restricted: bool = None, access_code: str = None,
                   restricted_genres: List[str] = None,
                   area_type: str = None,
                   start_date: str = None,
                   end_date: str = None,
                   external_url: str = None,
                   description: str = None) -> Dict:
        """エリアを更新"""
        area = Area.get(area_id)
        
        if not area:
            raise ValueError('AREA_NOT_FOUND')
        
        # 更新があるフィールドのみ変更
        if area_name is not None:
            area.area_name = area_name
        if center_latitude is not None:
            area.center_latitude = center_latitude
        if center_longitude is not None:
            area.center_longitude = center_longitude
        if display_order is not None:
            area.display_order = display_order
        if is_active is not None:
            area.is_active = is_active
        if available_genres is not None:
            area.available_genres = available_genres
        if is_restricted is not None:
            area.is_restricted = is_restricted
        if access_code is not None:
            area.access_code = access_code
        if restricted_genres is not None:
            area.restricted_genres = restricted_genres
        if area_type is not None:
            area.area_type = area_type
        if start_date is not None:
            area.start_date = start_date
        if end_date is not None:
            area.end_date = end_date
        if external_url is not None:
            area.external_url = external_url
        if description is not None:
            area.description = description
        
        area.save()
        
        return area.to_dict(for_dynamodb=False)
    
    @staticmethod
    def delete_area(area_id: str) -> Dict:
        """エリアを論理削除"""
        Area.delete(area_id)
        
        return {
            'message': 'エリアを削除しました',
            'area_id': area_id
        }
