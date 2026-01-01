import json
import base64
from utils.response import success_response, error_response
from services.user_service import UserService
from services.spot_service import SpotService
from services.checkin_service import CheckInService
from services.quiz_service import QuizService
from services.admin_service import AdminService

def handler(event, context):
    """メインハンドラー"""
    try:
        # HTTPメソッドとパスを取得
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        
        # OPTIONSリクエスト（CORS preflight）
        if http_method == 'OPTIONS':
            return success_response({})
        
        # ルーティング
        if path == '/users/create' and http_method == 'POST':
            return create_user(event)
        
        elif path == '/users/login' and http_method == 'POST':
            return login(event)
        
        elif path.startswith('/users/') and path.endswith('/nickname') and http_method == 'PUT':
            return set_nickname(event)
        
        elif path.startswith('/users/') and path.endswith('/history') and http_method == 'GET':
            return get_history(event)
        
        elif path == '/master/version' and http_method == 'GET':
            return get_master_version(event)
        
        elif path == '/master/spots' and http_method == 'GET':
            return get_spots(event)
        
        elif path == '/checkins' and http_method == 'POST':
            return checkin(event)
        
        elif path == '/quiz/answer' and http_method == 'POST':
            return answer_quiz(event)
        
        elif path.startswith('/quiz/cooldown/') and http_method == 'GET':
            return check_cooldown(event)
        
        # 管理画面API
        elif path == '/admin/login' and http_method == 'POST':
            return admin_login(event)
        
        elif path == '/admin/spots' and http_method == 'GET':
            return admin_get_spots(event)
        
        elif path == '/admin/spots' and http_method == 'POST':
            return admin_create_spot(event)
        
        elif path.startswith('/admin/spots/') and http_method == 'PUT':
            return admin_update_spot(event)
        
        elif path.startswith('/admin/spots/') and http_method == 'DELETE':
            return admin_delete_spot(event)
        
        elif path == '/admin/images/upload' and http_method == 'POST':
            return admin_upload_image(event)
        
        else:
            return error_response('NOT_FOUND', 'Endpoint not found', 404)
    
    except Exception as e:
        return error_response('INTERNAL_ERROR', str(e), 500)


# ユーザー関連
def create_user(event):
    try:
        result = UserService.create_user()
        return success_response(result, 201)
    except Exception as e:
        return error_response('INTERNAL_ERROR', str(e), 500)


def login(event):
    try:
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('user_id')
        
        result = UserService.login(user_id)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return error_response('INTERNAL_ERROR', str(e), 500)


def set_nickname(event):
    try:
        path_parts = event['path'].split('/')
        user_id = path_parts[2]
        
        body = json.loads(event.get('body', '{}'))
        nickname = body.get('nickname')
        
        result = UserService.set_nickname(user_id, nickname)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return error_response('INTERNAL_ERROR', str(e), 500)


def get_history(event):
    try:
        path_parts = event['path'].split('/')
        user_id = path_parts[2]
        
        query_params = event.get('queryStringParameters') or {}
        limit = int(query_params.get('limit', 50))
        offset = int(query_params.get('offset', 0))
        
        result = UserService.get_history(user_id, limit, offset)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return error_response('INTERNAL_ERROR', str(e), 500)


# マスタ関連
def get_master_version(event):
    try:
        result = SpotService.get_master_version()
        return success_response(result)
    except Exception as e:
        return error_response('INTERNAL_ERROR', str(e), 500)


def get_spots(event):
    try:
        query_params = event.get('queryStringParameters') or {}
        client_version = query_params.get('version')
        
        result = SpotService.get_all_spots(client_version)
        return success_response(result)
    except Exception as e:
        return error_response('INTERNAL_ERROR', str(e), 500)


# チェックイン関連
def checkin(event):
    try:
        body = json.loads(event.get('body', '{}'))
        
        result = CheckInService.checkin(
            user_id=body.get('user_id'),
            spot_id=body.get('spot_id'),
            latitude=float(body.get('latitude')),
            longitude=float(body.get('longitude'))
        )
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return error_response('INTERNAL_ERROR', str(e), 500)


def answer_quiz(event):
    try:
        body = json.loads(event.get('body', '{}'))
        
        result = QuizService.answer_quiz(
            user_id=body.get('user_id'),
            spot_id=body.get('spot_id'),
            answer=int(body.get('answer'))
        )
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return error_response('INTERNAL_ERROR', str(e), 500)


def check_cooldown(event):
    try:
        path_parts = event['path'].split('/')
        user_id = path_parts[3]
        spot_id = path_parts[4]
        
        result = QuizService.check_cooldown(user_id, spot_id)
        return success_response(result)
    except Exception as e:
        return error_response('INTERNAL_ERROR', str(e), 500)


# 管理画面関連
def check_admin_auth(event):
    """管理者認証チェック"""
    headers = event.get('headers', {})
    password = headers.get('X-Admin-Password') or headers.get('x-admin-password')
    
    if not password:
        auth_header = headers.get('Authorization') or headers.get('authorization')
        if auth_header and auth_header.startswith('Bearer '):
            password = auth_header[7:]
    
    if not AdminService.authenticate(password):
        raise ValueError('INVALID_PASSWORD')


def admin_login(event):
    try:
        body = json.loads(event.get('body', '{}'))
        password = body.get('password')
        
        if AdminService.authenticate(password):
            return success_response({'authenticated': True})
        else:
            return error_response('INVALID_PASSWORD', 'Invalid password', 401)
    except Exception as e:
        return error_response('INTERNAL_ERROR', str(e), 500)


def admin_get_spots(event):
    try:
        check_admin_auth(event)
        result = AdminService.get_all_spots()
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 401)
    except Exception as e:
        return error_response('INTERNAL_ERROR', str(e), 500)


def admin_create_spot(event):
    try:
        check_admin_auth(event)
        body = json.loads(event.get('body', '{}'))
        
        result = AdminService.create_spot(body)
        return success_response(result, 201)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return error_response('INTERNAL_ERROR', str(e), 500)


def admin_update_spot(event):
    try:
        check_admin_auth(event)
        path_parts = event['path'].split('/')
        spot_id = path_parts[3]
        
        body = json.loads(event.get('body', '{}'))
        
        result = AdminService.update_spot(spot_id, body)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return error_response('INTERNAL_ERROR', str(e), 500)


def admin_delete_spot(event):
    try:
        check_admin_auth(event)
        path_parts = event['path'].split('/')
        spot_id = path_parts[3]
        
        result = AdminService.delete_spot(spot_id)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return error_response('INTERNAL_ERROR', str(e), 500)


def admin_upload_image(event):
    try:
        check_admin_auth(event)
        
        # multipart/form-dataの処理
        from multipart import MultipartParser
        from io import BytesIO
        
        content_type_header = event.get('headers', {}).get('content-type') or event.get('headers', {}).get('Content-Type', '')
        
        if 'multipart/form-data' not in content_type_header:
            return error_response('INVALID_REQUEST', 'Invalid content type', 400)
        
        # Base64デコード
        body = event.get('body', '')
        is_base64 = event.get('isBase64Encoded', False)
        
        if is_base64:
            body_bytes = base64.b64decode(body)
        else:
            body_bytes = body.encode('utf-8')
        
        # boundaryを取得
        boundary = None
        for part in content_type_header.split(';'):
            if 'boundary=' in part:
                boundary = part.split('boundary=')[1].strip()
                break
        
        if not boundary:
            return error_response('INVALID_REQUEST', 'No boundary in content type', 400)
        
        # multipartパース
        parser = MultipartParser(
            BytesIO(body_bytes),
            boundary.encode('utf-8'),
            len(body_bytes)
        )
        
        file_data = None
        file_content_type = None
        
        for part in parser:
            if part.name == 'file':
                file_data = part.file.read()
                file_content_type = part.content_type or 'image/jpeg'
                break
        
        if not file_data:
            return error_response('INVALID_REQUEST', 'No file in request', 400)
        
        result = AdminService.upload_image(file_data, file_content_type)
        return success_response(result)
    
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return error_response('INTERNAL_ERROR', str(e), 500)
