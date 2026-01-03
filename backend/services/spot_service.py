from models.spot import Spot
from typing import Dict, List

class SpotService:
    @staticmethod
    def get_master_version() -> Dict:
        """マスターバージョンを取得"""
        return Spot.get_master_version()
    
@staticmethod
    def get_all_spots(client_version: str = None) -> Dict:
        """全スポット情報を取得"""
        current_version_info = Spot.get_master_version()
        current_version = current_version_info['version']
        
        # クライアントが最新バージョンを持っている場合は空配列を返す
        if client_version == current_version:
            return {
                'version': current_version,
                'spots': []
            }
        
        # 全スポットを取得（API用に変換）
        spots = Spot.get_all()
        spots_data = [spot.to_dict(for_dynamodb=False) for spot in spots]
        
        return {
            'version': current_version,
            'spots': spots_data
        }
    
    @staticmethod
    def get_spot(spot_id: str) -> Dict:
        """特定のスポットを取得"""
        spot = Spot.get(spot_id)
        
        if not spot:
            raise ValueError('SPOT_NOT_FOUND')
        
        return spot.to_dict()
