import time
import boto3
from typing import Optional
from config import config

# 管理パスワードは SSM パラメータストア（SecureString）に置き、実行時に読む。
# 環境変数や CloudFormation のテンプレートに平文で残さないため
_CACHE_SECONDS = 300

_ssm_client = None
_cached_value: Optional[str] = None
_cached_at = 0.0


def get_admin_password() -> Optional[str]:
    """管理パスワードを返す（5 分キャッシュ）。読めなければ None"""
    global _ssm_client, _cached_value, _cached_at

    if _cached_value is not None and time.time() - _cached_at < _CACHE_SECONDS:
        return _cached_value
    if not config.ADMIN_PASSWORD_PARAM:
        return None

    try:
        if _ssm_client is None:
            _ssm_client = boto3.client('ssm', region_name=config.AWS_REGION)
        response = _ssm_client.get_parameter(Name=config.ADMIN_PASSWORD_PARAM, WithDecryption=True)
    except Exception as e:
        # 値は出さず、読めなかったことだけを記録する
        print(f"管理パスワードを SSM から読めませんでした: {type(e).__name__}")
        return None

    _cached_value = response['Parameter']['Value']
    _cached_at = time.time()
    return _cached_value
