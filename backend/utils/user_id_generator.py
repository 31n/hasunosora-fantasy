import secrets
import string

def generate_user_id() -> str:
    """
    ユーザーIDを生成
    - 9文字の英数字大文字
    - 紛らわしい文字を除外: 0, O, I, L, 1
    - secrets モジュールを使用（暗号学的に安全な乱数）
    """
    allowed_chars = ''.join([
        c for c in string.ascii_uppercase + string.digits
        if c not in ['0', 'O', 'I', 'L', '1']
    ])
    # 使用可能文字: ABCDEFGHJKMNPQRSTUVWXYZ23456789

    user_id = ''.join(secrets.choice(allowed_chars) for _ in range(9))
    return user_id
