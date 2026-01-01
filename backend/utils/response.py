import json
from typing import Any, Dict, Optional

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
        }, ensure_ascii=False)
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
        }, ensure_ascii=False)
    }