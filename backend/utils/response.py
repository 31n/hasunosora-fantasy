import json
from typing import Any, Dict, Optional
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    """Decimal型をfloat/intに変換するエンコーダー"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            # 整数の場合はintに、小数の場合はfloatに変換
            if obj % 1 == 0:
                return int(obj)
            else:
                return float(obj)
        return super(DecimalEncoder, self).default(obj)

def success_response(data: Any, status_code: int = 200) -> Dict:
    """成功レスポンスを生成"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Password,Authorization,x-admin-password,authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps({
            'success': True,
            'data': data,
            'error': None
        }, ensure_ascii=False, cls=DecimalEncoder)
    }

def error_response(code: str, message: str, status_code: int = 400) -> Dict:
    """エラーレスポンスを生成"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Password,Authorization,x-admin-password,authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps({
            'success': False,
            'data': None,
            'error': {
                'code': code,
                'message': message
            }
        }, ensure_ascii=False, cls=DecimalEncoder)
    }