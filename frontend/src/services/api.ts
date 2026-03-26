import type {
  ApiResponse,
  User,
  CheckInHistory,
  CheckInResponse,
  QuizChallengeResponse,
  QuizAnswerResponse,
  CooldownResponse,
  MasterVersionResponse,
  MasterDataResponse,
  SpotsResponse,
  UnlockAreaResponse,
  Spot,
  Area,
  QuizType,
  Announcement
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://your-api-gateway-url';

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!data.success || data.error) {
    throw new Error(data.error?.message || 'API Error');
  }

  return data.data as T;
}

// ユーザー関連API
export const userApi = {
  create: async (): Promise<User> => {
    return fetchApi<User>('/users/create', { method: 'POST' });
  },

  login: async (userId: string): Promise<User> => {
    return fetchApi<User>('/users/login', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  },

  setNickname: async (userId: string, nickname: string): Promise<User> => {
    return fetchApi<User>(`/users/${userId}/nickname`, {
      method: 'PUT',
      body: JSON.stringify({ nickname }),
    });
  },

  setSelectedArea: async (userId: string, selectedArea: string | null): Promise<User> => {
    return fetchApi<User>(`/users/${userId}/area`, {
      method: 'PUT',
      body: JSON.stringify({ selected_area: selectedArea }),
    });
  },

  getHistory: async (
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<{ user_id: string; total_count: number; checkins: CheckInHistory[] }> => {
    return fetchApi(
      `/users/${userId}/history?limit=${limit}&offset=${offset}`
    );
  },

  unlockArea: async (userId: string, areaCode: string): Promise<UnlockAreaResponse> => {
    return fetchApi<UnlockAreaResponse>(`/users/${userId}/unlock-area`, {
      method: 'POST',
      body: JSON.stringify({ area_code: areaCode }),
    });
  },

  setSelectedQuizType: async (userId: string, selectedQuizType: string | null): Promise<User> => {
    return fetchApi<User>(`/users/${userId}/quiz-type`, {
      method: 'PUT',
      body: JSON.stringify({ selected_quiz_type: selectedQuizType }),
    });
  },
};

// マスタ関連API
export const masterApi = {
  getVersion: async (): Promise<MasterVersionResponse> => {
    return fetchApi<MasterVersionResponse>('/master/version');
  },

  getMasterData: async (version?: string): Promise<MasterDataResponse> => {
    const url = version ? `/master/data?version=${version}` : '/master/data';
    return fetchApi<MasterDataResponse>(url);
  },

  getSpots: async (version?: string): Promise<SpotsResponse> => {
    const url = version ? `/master/spots?version=${version}` : '/master/spots';
    return fetchApi<SpotsResponse>(url);
  },
};

// チェックイン・クイズAPI
export const checkinApi = {
  checkin: async (
    userId: string,
    spotId: string,
    latitude: number,
    longitude: number
  ): Promise<CheckInResponse> => {
    return fetchApi<CheckInResponse>('/checkins', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, spot_id: spotId, latitude, longitude }),
    });
  },

  answerQuiz: async (
    userId: string,
    spotId: string,
    answer: number,
    quizTypeId?: string | null
  ): Promise<QuizAnswerResponse> => {
    return fetchApi<QuizAnswerResponse>('/quiz/answer', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, spot_id: spotId, answer, quiz_type_id: quizTypeId ?? null }),
    });
  },

  quizChallenge: async (
    userId: string,
    spotId: string,
    latitude: number,
    longitude: number
  ): Promise<QuizChallengeResponse> => {
    return fetchApi<QuizChallengeResponse>('/quiz/challenge', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, spot_id: spotId, latitude, longitude }),
    });
  },

  checkCooldown: async (userId: string, spotId: string): Promise<CooldownResponse> => {
    return fetchApi<CooldownResponse>(`/quiz/cooldown/${userId}/${spotId}`);
  },
};

// 管理画面API
export const adminApi = {
  login: async (password: string): Promise<{ authenticated: boolean }> => {
    return fetchApi<{ authenticated: boolean }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  // エリア管理
  getAreas: async (password: string): Promise<Area[]> => {
    return fetchApi<Area[]>('/admin/areas', {
      headers: { 'X-Admin-Password': password },
    });
  },

  createArea: async (password: string, areaData: Partial<Area>): Promise<Area> => {
    return fetchApi<Area>('/admin/areas', {
      method: 'POST',
      headers: { 'X-Admin-Password': password },
      body: JSON.stringify(areaData),
    });
  },

  updateArea: async (password: string, areaId: string, areaData: Partial<Area>): Promise<Area> => {
    return fetchApi<Area>(`/admin/areas/${areaId}`, {
      method: 'PUT',
      headers: { 'X-Admin-Password': password },
      body: JSON.stringify(areaData),
    });
  },

  deleteArea: async (password: string, areaId: string): Promise<any> => {
    return fetchApi(`/admin/areas/${areaId}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Password': password },
    });
  },

  // スポット管理
  getSpots: async (password: string): Promise<{ spots: Spot[] }> => {
    return fetchApi<{ spots: Spot[] }>('/admin/spots', {
      headers: { 'X-Admin-Password': password },
    });
  },

  createSpot: async (password: string, spotData: Partial<Spot>): Promise<any> => {
    return fetchApi('/admin/spots', {
      method: 'POST',
      headers: { 'X-Admin-Password': password },
      body: JSON.stringify(spotData),
    });
  },

  updateSpot: async (
    password: string,
    spotId: string,
    spotData: Partial<Spot>
  ): Promise<any> => {
    return fetchApi(`/admin/spots/${spotId}`, {
      method: 'PUT',
      headers: { 'X-Admin-Password': password },
      body: JSON.stringify(spotData),
    });
  },

  deleteSpot: async (password: string, spotId: string): Promise<any> => {
    return fetchApi(`/admin/spots/${spotId}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Password': password },
    });
  },

  uploadImage: async (password: string, file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/admin/images/upload`, {
      method: 'POST',
      headers: { 'X-Admin-Password': password },
      body: formData,
    });

    const data: ApiResponse<{ url: string }> = await response.json();

    if (!data.success || data.error) {
      throw new Error(data.error?.message || 'Upload failed');
    }

    return data.data as { url: string };
  },

  // クイズタイプ管理
  getQuizTypes: async (password: string): Promise<QuizType[]> => {
    return fetchApi<QuizType[]>('/admin/quiz-types', {
      headers: { 'X-Admin-Password': password },
    });
  },

  createQuizType: async (password: string, data: Partial<QuizType>): Promise<QuizType> => {
    return fetchApi<QuizType>('/admin/quiz-types', {
      method: 'POST',
      headers: { 'X-Admin-Password': password },
      body: JSON.stringify(data),
    });
  },

  updateQuizType: async (password: string, quizTypeId: string, data: Partial<QuizType>): Promise<QuizType> => {
    return fetchApi<QuizType>(`/admin/quiz-types/${quizTypeId}`, {
      method: 'PUT',
      headers: { 'X-Admin-Password': password },
      body: JSON.stringify(data),
    });
  },

  deleteQuizType: async (password: string, quizTypeId: string): Promise<any> => {
    return fetchApi(`/admin/quiz-types/${quizTypeId}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Password': password },
    });
  },
};

// パブリック - クイズタイプ
export const quizTypeApi = {
  getAll: async (): Promise<QuizType[]> => {
    return fetchApi<QuizType[]>('/quiz-types');
  },
};

// パブリック - お知らせ
export const announcementApi = {
  getActive: async (): Promise<{ announcements: Announcement[] }> => {
    return fetchApi<{ announcements: Announcement[] }>('/announcements');
  },
};

// 管理画面 - お知らせ管理
export const adminAnnouncementApi = {
  getAll: async (password: string): Promise<{ announcements: Announcement[] }> => {
    return fetchApi<{ announcements: Announcement[] }>('/admin/announcements', {
      headers: { 'X-Admin-Password': password },
    });
  },

  create: async (password: string, data: Partial<Announcement>): Promise<Announcement> => {
    return fetchApi<Announcement>('/admin/announcements', {
      method: 'POST',
      headers: { 'X-Admin-Password': password },
      body: JSON.stringify(data),
    });
  },

  update: async (password: string, id: string, data: Partial<Announcement>): Promise<Announcement> => {
    return fetchApi<Announcement>(`/admin/announcements/${id}`, {
      method: 'PUT',
      headers: { 'X-Admin-Password': password },
      body: JSON.stringify(data),
    });
  },

  delete: async (password: string, id: string): Promise<any> => {
    return fetchApi(`/admin/announcements/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Password': password },
    });
  },
};
