import math

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    2点間の距離をHaversine公式で計算（メートル単位）
    
    Args:
        lat1: 地点1の緯度
        lon1: 地点1の経度
        lat2: 地点2の緯度
        lon2: 地点2の経度
    
    Returns:
        距離（メートル）
    """
    # 地球の半径（メートル）
    R = 6371000
    
    # ラジアンに変換
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    # Haversine公式
    a = (math.sin(delta_lat / 2) ** 2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * 
         math.sin(delta_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return distance

def is_within_range(user_lat: float, user_lon: float, 
                   spot_lat: float, spot_lon: float, 
                   radius: float) -> bool:
    """
    ユーザーがスポットの検知範囲内にいるかチェック
    
    Args:
        user_lat: ユーザーの緯度
        user_lon: ユーザーの経度
        spot_lat: スポットの緯度
        spot_lon: スポットの経度
        radius: 検知半径（メートル）
    
    Returns:
        範囲内ならTrue
    """
    distance = haversine_distance(user_lat, user_lon, spot_lat, spot_lon)
    return distance <= radius
