// user.ts
export interface User {
  user_id: string;
  nickname?: string;
  total_score: number;
  selected_areas?: string[]; // 選択中のエリアIDリスト
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
  area_type: 'normal' | 'campaign'; // エリア種別
  start_date?: string | null; // キャンペーン開始日 (YYYY-MM-DD)
  end_date?: string | null;   // キャンペーン終了日 (YYYY-MM-DD)
  external_url?: string | null; // 公式ページURL
  description?: string | null;  // エリア詳細説明
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

// MCPサーバ用: 登場作品情報
export interface PilgrimageWork {
  title: string;
  media_type: string; // 'anime' | 'manga' | 'game' | 'novel' | 'vtuber' | 'live_action' | 'other'
  episode_ref?: string;       // 登場エピソード・巻・章
  scene_description?: string; // どのシーンか
  character?: string[];       // 登場キャラクター
  air_year?: number;          // 放送・発表年
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
  areas?: string[]; // エリアIDリスト
  quizzes: QuizWithType[]; // クイズタイプ別クイズリスト
  url?: string; // 外部リンク（任意）
  version: string;
  created_at: string;
  updated_at: string;
  // --- 以下はMCPサーバ用付加情報（任意）。既存アプリ動作には影響しない ---
  address?: string;              // 住所
  short_description?: string;   // 一言説明
  category?: string;            // スポットカテゴリ
  tags?: string[];              // 追加キーワード
  opening_hours?: string;       // 開館時間
  access_info?: string;         // アクセス情報（最寄り駅・バス停など）
  historical_period?: string;   // 時代・年代
  wikipedia_url?: string;       // Wikipedia URL
  estimated_visit_time?: string; // 見学時間目安
  admission?: string;           // 入場料
  works?: PilgrimageWork[];     // 登場作品情報
  shooting_tips?: string;       // 撮影アングル・立ち位置ヒント
  visit_notes?: string;         // 巡礼時の注意事項
  is_official?: boolean;        // 公式聖地認定フラグ
  pilgrimage_difficulty?: string; // アクセス難易度 ('easy'|'moderate'|'hard')
  scene_season?: string;        // 劇中の季節
  member_icon?: string | null;  // メンバーアイコンファイル名 (例: icon_alice.png)
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