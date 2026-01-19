/**
 * 2点間の距離をHaversine公式で計算（メートル単位）
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // 地球の半径（メートル）
  
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * 距離を人間が読みやすい形式にフォーマット
 */
export function formatDistance(distance: number | null | undefined): string {
  if (distance === null || distance === undefined) {
    return '-';
  }
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
}
