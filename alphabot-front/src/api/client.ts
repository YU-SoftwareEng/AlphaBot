export type ApiError = Error & { status?: number }

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || ''

function getAccessToken(): string | null {
  return window.localStorage.getItem('access_token')
}

function getRefreshToken(): string | null {
  return window.localStorage.getItem('refresh_token')
}

// 토큰 갱신 중인지 확인하는 플래그
let isRefreshing = false;
// 갱신 중일 때 대기 중인 요청들을 저장하는 배열
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.map((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

// 리프레시 토큰으로 액세스 토큰 갱신 요청 함수
async function processRefreshToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const refreshRes = await fetch(`${API_BASE_URL}/api/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      window.localStorage.setItem('access_token', data.access_token);
      window.localStorage.setItem('refresh_token', data.refresh_token);
      onTokenRefreshed(data.access_token); // 대기 중인 요청들 재실행
      return true;
    } else {
      throw new Error('Refresh failed');
    }
  } catch (error) {
    // 갱신 실패 시 로그아웃 처리
    window.localStorage.removeItem('access_token');
    window.localStorage.removeItem('refresh_token');
    window.location.href = '/login';
    return false;
  } finally {
    isRefreshing = false;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options
  const url = `${API_BASE_URL}${path}`
  
  const init: RequestInit = {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  }

  if (auth) {
    const token = getAccessToken()
    if (token) {
      (init.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  }

  let res = await fetch(url, init)

  // 401 에러 발생 시 토큰 갱신 및 재요청 로직
  if (res.status === 401 && auth) {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw await createApiError(res);
    }

    // 1.먼저 재시도 로직(Subscriber)을 정의하고 Promise를 만듬
    const retryPromise = new Promise<T>((resolve, reject) => {
      addRefreshSubscriber(async (newToken) => {
        // 새 토큰으로 헤더 업데이트 후 재요청
        (init.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        try {
          const retryRes = await fetch(url, init);
          if (!retryRes.ok) {
             const err = await createApiError(retryRes);
             reject(err);
          } else {
             resolve(await parseResponse<T>(retryRes));
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    // 2. 만약 갱신 중이 아니라면 갱신을 시작합니다.
    if (!isRefreshing) {
      isRefreshing = true;
      processRefreshToken(); // await 하지 않음 (비동기로 진행)
    }

    // 3. 대기(Promise)를 반환합니다.
    return retryPromise;
  }

  if (!res.ok) {
    throw await createApiError(res);
  }

  return parseResponse<T>(res);
}

async function createApiError(res: Response): Promise<ApiError> {
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const err: ApiError = new Error(
    isJson ? JSON.stringify(await res.json()).slice(0, 500) : await res.text(),
  )
  err.name = 'ApiError'
  err.status = res.status
  return err
}

async function parseResponse<T>(res: Response): Promise<T> {
  // 204 No Content 처리
  if (res.status === 204) {
    return (null as unknown) as T;
  }
  const isJson = res.headers.get('content-type')?.includes('application/json')
  return (isJson ? res.json() : (null as unknown)) as T
}