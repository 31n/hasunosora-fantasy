from models.spot import Spot
from models.area import Area
from models.quiz_type import QuizType
from typing import Dict, List

class SpotService:
    @staticmethod
    def get_master_version() -> Dict:
        """マスターバージョンを取得"""
        return Spot.get_master_version()

    @staticmethod
    def get_master_data(client_version: str = None) -> Dict:
        """全マスターデータ（エリア + スポット + クイズタイプ）を取得"""
        current_version_info = Spot.get_master_version()
        current_version = current_version_info['version']

        # クライアントが最新バージョンを持っている場合は空配列を返す
        if client_version == current_version:
            return {
                'version': current_version,
                'areas': [],
                'spots': [],
                'quiz_types': []
            }

        # 全エリアを取得（アクティブのみ）
        areas = Area.get_all(include_inactive=False)
        areas_data = [area.to_dict(for_dynamodb=False) for area in areas]

        # 全スポットを取得（API用に変換）
        spots = Spot.get_all()
        spots_data = [spot.to_dict(for_dynamodb=False) for spot in spots]

        # 全クイズタイプを取得（アクティブのみ）
        quiz_types = QuizType.get_all(include_inactive=False)
        quiz_types_data = [qt.to_dict() for qt in quiz_types]

        return {
            'version': current_version,
            'areas': areas_data,
            'spots': spots_data,
            'quiz_types': quiz_types_data
        }
    
    @staticmethod
    def get_all_spots(client_version: str = None) -> Dict:
        """全スポット情報を取得（後方互換性のため残す）"""
        # get_master_dataを呼び出すが、spotsのみ返す
        data = SpotService.get_master_data(client_version)
        return {
            'version': data['version'],
            'spots': data['spots']
        }
    
    @staticmethod
    def get_spot(spot_id: str) -> Dict:
        """特定のスポットを取得"""
        spot = Spot.get(spot_id)
        
        if not spot:
            raise ValueError('SPOT_NOT_FOUND')
        
        return spot.to_dict()
