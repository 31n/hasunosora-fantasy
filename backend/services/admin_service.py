from models.spot import Spot
from utils.s3 import upload_image, delete_image
from config import config
from typing import Dict, List
import base64

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
            'spots': [spot.to_dict() for spot in spots]
        }
    
    @staticmethod
    def create_spot(spot_data: Dict) -> Dict:
        """スポットを作成"""
        # クイズのバリデーション
        AdminService._validate_quiz(spot_data.get('quiz', {}))
        
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
            quiz=spot_data.get('quiz', {})
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
        
        # クイズのバリデーション
        if 'quiz' in spot_data:
            AdminService._validate_quiz(spot_data['quiz'])
        
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
        spot.quiz = spot_data.get('quiz', spot.quiz)
        
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
