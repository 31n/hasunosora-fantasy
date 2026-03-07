// user.ts
export interface User {
  user_id: string;
  nickname?: string;
  total_score: number;
  selected_area?: string;
  unlocked_areas: string[]; // 解放済みエリアのリスト
  created_at: string;
}

// area.ts
export interface Area {
  area_id: string;
  area_name: string;
  center_latitude: number;
  center_longitude: number;
  display_order: number;
  is_active: boolean;
  available_genres: string[]; // このエリアで利用可能なジャンル
  is_restricted: boolean; // このエリアが制限されているか
  access_code?: string; // アクセスコード
  created_at: string;
  updated_at: string;
}

// spot.ts
export interface Quiz {
  question: string;
  choices: string[];
  correct_answer: number;
  score: number;
}

export interface Spot {
  spot_id: string;
  spot_name: string;
  reading?: string; // ふりがな（並び替え用）
  description: string;
  latitude: number;
  longitude: number;
  detection_radius: number;
  images: string[];
  genre: string[]; // ジャンル（複数可）
  area?: string; // エリアID
  quiz?: Quiz; // クイズは任意
  version: string;
  created_at: string;
  updated_at: string;
}

export interface CheckInHistory {
  spot_id: string;
  spot_name: string;
  checked_in_at: string;
  quiz_answered: boolean;
  quiz_correct: boolean;
  score_earned: number;
}

// api.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface CheckInResponse {
  score_earned: number;
  total_score: number;
  already_scored_today: boolean;
  quiz_available: boolean;
  quiz?: {
    question: string;
    choices: string[];
    score: number;
  };
  message?: string;
}

export interface QuizChallengeResponse {
  checkin_score_earned: number;
  total_score: number;
  quiz_available: boolean;
  quiz: {
    question: string;
    choices: string[];
    score: number;
  };
}

export interface QuizAnswerResponse {
  correct: boolean;
  score_earned: number;
  total_score: number;
  cooldown_until?: string;
  message: string;
}

export interface CooldownResponse {
  on_cooldown: boolean;
  cooldown_until?: string;
  remaining_seconds?: number;
}

export interface MasterVersionResponse {
  version: string;
  updated_at: string;
}

export interface MasterDataResponse {
  version: string;
  areas: Area[];
  spots: Spot[];
}

export interface SpotsResponse {
  version: string;
  spots: Spot[];
}

export interface UnlockAreaResponse {
  success: boolean;
  unlocked_area: string;
  user: User;
}