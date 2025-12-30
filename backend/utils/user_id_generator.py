import random
import string

def generate_user_id() -> str:
    """
    ユーザーIDを生成
    - 9文字の英数字大文字
    - 紛らわしい文字を除外: 0, O, I, L, 1
    """
    allowed_chars = ''.join([
        c for c in string.ascii_uppercase + string.digits
        if c not in ['0', 'O', 'I', 'L', '1']
    ])
    # 使用可能文字: ABCDEFGHJKMNPQRSTUVWXYZ23456789
    
    user_id = ''.join(random.choices(allowed_chars, k=9))
    return user_id
