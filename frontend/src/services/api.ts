import type {
  ApiResponse,
  User,
  CheckInHistory,
  CheckInResponse,
  QuizAnswerResponse,
  CooldownResponse,
  MasterVersionResponse,
  SpotsResponse,
  Spot
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

  getHistory: async (
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<{ user_id: string; total_count: number; checkins: CheckInHistory[] }> => {
    return fetchApi(
      `/users/${userId}/history?limit=${limit}&offset=${offset}`
    );
  },
};

// マスタ関連API
export const masterApi = {
  getVersion: async (): Promise<MasterVersionResponse> => {
    return fetchApi<MasterVersionResponse>('/master/version');
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
    answer: number
  ): Promise<QuizAnswerResponse> => {
    return fetchApi<QuizAnswerResponse>('/quiz/answer', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, spot_id: spotId, answer }),
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
};
