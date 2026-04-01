// user.ts
export interface User {
  user_id: string;
  nickname?: string;
  total_score: number;
  selected_area?: string;
  unlocked_areas: string[]; // 解放済みエリアのリスト
  selected_quiz_type?: string | null; // 選択中のクイズタイプID（null = デフォルト）
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

// quiz_type.ts
export interface QuizType {
  quiz_type_id: string;
  name: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// spot.ts
export interface QuizWithType {
  quiz_type_id: string | null; // null = デフォルトクイズ
  question: string;
  question_image?: string | null; // 問題画像URL（任意）
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
  quizzes: QuizWithType[]; // クイズタイプ別クイズリスト
  url?: string; // 外部リンク（任意）
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
  quiz_type_id?: string | null;
  quiz?: {
    question: string;
    question_image?: string | null;
    choices: string[];
    score: number;
  };
  message?: string;
}

export interface QuizChallengeResponse {
  checkin_score_earned: number;
  total_score: number;
  quiz_available: boolean;
  quiz_type_id: string | null; // 出題されたクイズのタイプ
  quiz: {
    question: string;
    question_image?: string | null;
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
  quiz_types: QuizType[];
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

// announcement.ts
export interface Announcement {
  announcement_id: string;
  title: string;
  body: string;
  start_date: string; // 'YYYY-MM-DD'
  end_date: string;   // 'YYYY-MM-DD'
  is_active: boolean;
  created_at: string;
  updated_at: string;
}