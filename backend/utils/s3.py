import boto3
import uuid
import base64
from typing import Dict
from config import config

s3_client = boto3.client('s3', region_name=config.S3_REGION)

def upload_image(file_data: bytes, content_type: str) -> str:
    """
    画像をS3にアップロード
    
    Args:
        file_data: ファイルのバイトデータ
        content_type: MIMEタイプ
    
    Returns:
        S3のURL
    """
    # ファイル名を生成
    file_extension = content_type.split('/')[-1]
    if file_extension == 'jpeg':
        file_extension = 'jpg'
    
    file_name = f"{uuid.uuid4()}.{file_extension}"
    
    # S3にアップロード
    s3_client.put_object(
        Bucket=config.S3_BUCKET_NAME,
        Key=file_name,
        Body=file_data,
        ContentType=content_type
    )
    
    # URLを生成
    url = f"https://{config.S3_BUCKET_NAME}.s3.{config.S3_REGION}.amazonaws.com/{file_name}"
    return url

def delete_image(url: str) -> bool:
    """
    S3から画像を削除
    
    Args:
        url: S3のURL
    
    Returns:
        削除成功ならTrue
    """
    try:
        # URLからキーを抽出
        key = url.split('/')[-1]
        
        s3_client.delete_object(
            Bucket=config.S3_BUCKET_NAME,
            Key=key
        )
        return True
    except Exception:
        return False
