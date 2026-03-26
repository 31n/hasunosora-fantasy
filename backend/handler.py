import json
import re
import base64
from utils.response import success_response, error_response, internal_error_response
from services.user_service import UserService
from services.spot_service import SpotService
from services.checkin_service import CheckInService
from services.quiz_service import QuizService
from services.admin_service import AdminService
from services.area_service import AreaService
from services.quiz_type_service import QuizTypeService
from services.announcement_service import AnnouncementService

# ユーザーIDの許可文字（紛らわしい文字除外済み）
_USER_ID_RE = re.compile(r'^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{9}$')


def validate_user_id(user_id: str):
    """ユーザーIDフォーマット検証（パストラバーサル対策）"""
    if not user_id or not _USER_ID_RE.match(user_id):
        raise ValueError('INVALID_USER_ID')


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
        
        elif path.startswith('/users/') and path.endswith('/area') and http_method == 'PUT':
            return set_user_area(event)

        elif path.startswith('/users/') and path.endswith('/quiz-type') and http_method == 'PUT':
            return set_user_quiz_type(event)

        elif path.startswith('/users/') and path.endswith('/history') and http_method == 'GET':
            return get_history(event)
        
        elif path.startswith('/users/') and path.endswith('/unlock-area') and http_method == 'POST':
            return unlock_area(event)
        
        elif path == '/master/version' and http_method == 'GET':
            return get_master_version(event)
        
        elif path == '/master/data' and http_method == 'GET':
            return get_master_data(event)
        
        elif path == '/master/spots' and http_method == 'GET':
            return get_spots(event)
        
        elif path == '/checkins' and http_method == 'POST':
            return checkin(event)
        
        elif path == '/quiz/answer' and http_method == 'POST':
            return answer_quiz(event)

        elif path == '/quiz/challenge' and http_method == 'POST':
            return quiz_challenge(event)
        
        elif path.startswith('/quiz/cooldown/') and http_method == 'GET':
            return check_cooldown(event)
        
        elif path == '/quiz-types' and http_method == 'GET':
            return get_quiz_types(event)

        # 管理画面API
        elif path == '/admin/login' and http_method == 'POST':
            return admin_login(event)
        
        elif path == '/admin/areas' and http_method == 'GET':
            return admin_get_areas(event)
        
        elif path == '/admin/areas' and http_method == 'POST':
            return admin_create_area(event)
        
        elif path.startswith('/admin/areas/') and http_method == 'PUT':
            return admin_update_area(event)
        
        elif path.startswith('/admin/areas/') and http_method == 'DELETE':
            return admin_delete_area(event)
        
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

        elif path == '/admin/quiz-types' and http_method == 'GET':
            return admin_get_quiz_types(event)

        elif path == '/admin/quiz-types' and http_method == 'POST':
            return admin_create_quiz_type(event)

        elif path.startswith('/admin/quiz-types/') and http_method == 'PUT':
            return admin_update_quiz_type(event)

        elif path.startswith('/admin/quiz-types/') and http_method == 'DELETE':
            return admin_delete_quiz_type(event)

        # お知らせ関連
        elif path == '/announcements' and http_method == 'GET':
            return get_announcements(event)

        elif path == '/admin/announcements' and http_method == 'GET':
            return admin_get_announcements(event)

        elif path == '/admin/announcements' and http_method == 'POST':
            return admin_create_announcement(event)

        elif path.startswith('/admin/announcements/') and http_method == 'PUT':
            return admin_update_announcement(event)

        elif path.startswith('/admin/announcements/') and http_method == 'DELETE':
            return admin_delete_announcement(event)

        elif path == '/admin/stats' and http_method == 'GET':
            return admin_get_stats(event)

        else:
            return error_response('NOT_FOUND', 'Endpoint not found', 404)
    
    except Exception as e:
        return internal_error_response()


# ユーザー関連
def create_user(event):
    try:
        result = UserService.create_user()
        return success_response(result, 201)
    except Exception as e:
        return internal_error_response()


def login(event):
    try:
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('user_id')
        validate_user_id(user_id)

        result = UserService.login(user_id)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


def set_nickname(event):
    try:
        path_parts = event['path'].split('/')
        user_id = path_parts[2]
        validate_user_id(user_id)

        body = json.loads(event.get('body', '{}'))
        nickname = body.get('nickname')
        
        result = UserService.set_nickname(user_id, nickname)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


def get_history(event):
    try:
        path_parts = event['path'].split('/')
        user_id = path_parts[2]
        validate_user_id(user_id)

        query_params = event.get('queryStringParameters') or {}
        limit = int(query_params.get('limit', 50))
        offset = int(query_params.get('offset', 0))
        
        result = UserService.get_history(user_id, limit, offset)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


def set_user_area(event):
    try:
        path_parts = event['path'].split('/')
        user_id = path_parts[2]
        validate_user_id(user_id)

        body = json.loads(event.get('body', '{}'))
        selected_area = body.get('selected_area')
        
        result = UserService.set_selected_area(user_id, selected_area)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


def set_user_quiz_type(event):
    try:
        path_parts = event['path'].split('/')
        user_id = path_parts[2]
        validate_user_id(user_id)

        body = json.loads(event.get('body', '{}'))
        selected_quiz_type = body.get('selected_quiz_type')

        result = UserService.set_selected_quiz_type(user_id, selected_quiz_type)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


def unlock_area(event):
    try:
        path_parts = event['path'].split('/')
        user_id = path_parts[2]
        validate_user_id(user_id)

        body = json.loads(event.get('body', '{}'))
        area_code = body.get('area_code')

        if not area_code:
            return error_response('INVALID_REQUEST', 'area_code is required', 400)
        
        result = UserService.unlock_area(user_id, area_code)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


# マスタ関連
def get_master_version(event):
    try:
        result = SpotService.get_master_version()
        return success_response(result)
    except Exception as e:
        return internal_error_response()


def get_master_data(event):
    try:
        query_params = event.get('queryStringParameters') or {}
        client_version = query_params.get('version')
        
        result = SpotService.get_master_data(client_version)
        return success_response(result)
    except Exception as e:
        return internal_error_response()


def get_spots(event):
    try:
        query_params = event.get('queryStringParameters') or {}
        client_version = query_params.get('version')
        
        result = SpotService.get_all_spots(client_version)
        return success_response(result)
    except Exception as e:
        return internal_error_response()


# チェックイン関連
def checkin(event):
    try:
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('user_id')
        validate_user_id(user_id)

        result = CheckInService.checkin(
            user_id=user_id,
            spot_id=body.get('spot_id'),
            latitude=float(body.get('latitude')),
            longitude=float(body.get('longitude'))
        )
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


def answer_quiz(event):
    try:
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('user_id')
        validate_user_id(user_id)

        result = QuizService.answer_quiz(
            user_id=user_id,
            spot_id=body.get('spot_id'),
            answer=int(body.get('answer')),
            quiz_type_id=body.get('quiz_type_id')  # None = ユーザーの selected_quiz_type を使用
        )
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


def quiz_challenge(event):
    try:
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('user_id')
        validate_user_id(user_id)

        result = QuizService.quiz_challenge(
            user_id=user_id,
            spot_id=body.get('spot_id'),
            latitude=float(body.get('latitude')),
            longitude=float(body.get('longitude'))
        )
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


def check_cooldown(event):
    try:
        path_parts = event['path'].split('/')
        user_id = path_parts[3]
        spot_id = path_parts[4]
        validate_user_id(user_id)

        result = QuizService.check_cooldown(user_id, spot_id)
        return success_response(result)
    except Exception as e:
        return internal_error_response()


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
        return internal_error_response()


def admin_get_spots(event):
    try:
        check_admin_auth(event)
        result = AdminService.get_all_spots()
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 401)
    except Exception as e:
        return internal_error_response()


def admin_create_spot(event):
    try:
        check_admin_auth(event)
        body = json.loads(event.get('body', '{}'))
        
        result = AdminService.create_spot(body)
        return success_response(result, 201)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


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
        return internal_error_response()


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
        return internal_error_response()


def admin_upload_image(event):
    try:
        check_admin_auth(event)
        
        # multipart/form-dataの処理
        from email import message_from_bytes
        from email.policy import default
        import traceback
        
        # ヘッダーの取得（大文字小文字を考慮）
        headers = event.get('headers', {})
        content_type_header = headers.get('content-type') or headers.get('Content-Type', '')
        
        # デバッグログ
        print(f"Headers: {headers}")
        print(f"Content-Type: {content_type_header}")
        print(f"isBase64Encoded: {event.get('isBase64Encoded')}")
        
        if 'multipart/form-data' not in content_type_header:
            return error_response('INVALID_REQUEST', f'Invalid content type: {content_type_header}', 400)
        
        # Base64デコード
        body = event.get('body', '')
        is_base64 = event.get('isBase64Encoded', False)
        
        if is_base64:
            body_bytes = base64.b64decode(body)
        else:
            body_bytes = body.encode('utf-8')
        
        print(f"Body length: {len(body_bytes)}")
        
        # HTTPヘッダーを構築してメッセージとしてパース
        message_bytes = f"Content-Type: {content_type_header}\r\n\r\n".encode('utf-8') + body_bytes
        msg = message_from_bytes(message_bytes, policy=default)
        
        file_data = None
        file_content_type = None
        
        # マルチパートの各パートを処理
        part_count = 0
        for part in msg.iter_parts():
            part_count += 1
            content_disposition = part.get('Content-Disposition', '')
            print(f"Part {part_count}: {content_disposition}")
            
            if 'name="file"' in content_disposition or "name='file'" in content_disposition:
                file_data = part.get_payload(decode=True)
                file_content_type = part.get_content_type() or 'image/jpeg'
                print(f"Found file: {len(file_data) if file_data else 0} bytes, type: {file_content_type}")
                break
        
        if not file_data:
            return error_response('INVALID_REQUEST', f'No file in request (found {part_count} parts)', 400)
        
        result = AdminService.upload_image(file_data, file_content_type)
        return success_response(result)
    
    except ValueError as e:
        print(f"ValueError: {str(e)}")
        return error_response(str(e), str(e), 400)
    except Exception as e:
        print(f"Exception: {str(e)}")
        traceback.print_exc()
        return internal_error_response()


# 管理画面API - エリア関連
def admin_get_areas(event):
    try:
        result = AreaService.get_all_areas(include_inactive=True)
        return success_response(result)
    except Exception as e:
        return internal_error_response()


def admin_create_area(event):
    try:
        body = json.loads(event.get('body', '{}'))
        area_id = body.get('area_id')
        area_name = body.get('area_name')
        center_latitude = body.get('center_latitude')
        center_longitude = body.get('center_longitude')
        display_order = body.get('display_order', 0)
        available_genres = body.get('available_genres', [])
        is_restricted = body.get('is_restricted', False)
        access_code = body.get('access_code')
        
        result = AreaService.create_area(
            area_id=area_id,
            area_name=area_name,
            center_latitude=center_latitude,
            center_longitude=center_longitude,
            display_order=display_order,
            available_genres=available_genres,
            is_restricted=is_restricted,
            access_code=access_code
        )
        return success_response(result, 201)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


def admin_update_area(event):
    try:
        path_parts = event['path'].split('/')
        area_id = path_parts[3]
        
        body = json.loads(event.get('body', '{}'))
        
        result = AreaService.update_area(
            area_id=area_id,
            area_name=body.get('area_name'),
            center_latitude=body.get('center_latitude'),
            center_longitude=body.get('center_longitude'),
            display_order=body.get('display_order'),
            is_active=body.get('is_active'),
            available_genres=body.get('available_genres'),
            is_restricted=body.get('is_restricted'),
            access_code=body.get('access_code')
        )
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


def admin_delete_area(event):
    try:
        path_parts = event['path'].split('/')
        area_id = path_parts[3]

        result = AreaService.delete_area(area_id)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


# パブリック - クイズタイプ一覧
def get_quiz_types(event):
    try:
        result = QuizTypeService.get_all(include_inactive=False)
        return success_response(result)
    except Exception as e:
        return internal_error_response()


# 管理画面API - クイズタイプ関連
def admin_get_quiz_types(event):
    try:
        check_admin_auth(event)
        result = QuizTypeService.get_all(include_inactive=True)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 401)
    except Exception as e:
        return internal_error_response()


def admin_create_quiz_type(event):
    try:
        check_admin_auth(event)
        body = json.loads(event.get('body', '{}'))
        result = QuizTypeService.create(body)
        return success_response(result, 201)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


def admin_update_quiz_type(event):
    try:
        check_admin_auth(event)
        path_parts = event['path'].split('/')
        quiz_type_id = path_parts[3]
        body = json.loads(event.get('body', '{}'))
        result = QuizTypeService.update(quiz_type_id, body)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


def admin_delete_quiz_type(event):
    try:
        check_admin_auth(event)
        path_parts = event['path'].split('/')
        quiz_type_id = path_parts[3]
        result = QuizTypeService.delete(quiz_type_id)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


# お知らせ関連
def get_announcements(event):
    """公開中のお知らせ一覧（ユーザー向け）"""
    try:
        result = AnnouncementService.get_active()
        return success_response({'announcements': result})
    except Exception as e:
        return internal_error_response()


def admin_get_announcements(event):
    try:
        check_admin_auth(event)
        result = AnnouncementService.get_all()
        return success_response({'announcements': result})
    except ValueError as e:
        return error_response(str(e), str(e), 401)
    except Exception as e:
        return internal_error_response()


def admin_create_announcement(event):
    try:
        check_admin_auth(event)
        body = json.loads(event.get('body', '{}'))
        result = AnnouncementService.create(body)
        return success_response(result, 201)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


def admin_update_announcement(event):
    try:
        check_admin_auth(event)
        path_parts = event['path'].split('/')
        announcement_id = path_parts[3]
        body = json.loads(event.get('body', '{}'))
        result = AnnouncementService.update(announcement_id, body)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


def admin_delete_announcement(event):
    try:
        check_admin_auth(event)
        path_parts = event['path'].split('/')
        announcement_id = path_parts[3]
        result = AnnouncementService.delete(announcement_id)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()


def admin_get_stats(event):
    try:
        check_admin_auth(event)
        result = AdminService.get_stats()
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), str(e), 400)
    except Exception as e:
        return internal_error_response()
