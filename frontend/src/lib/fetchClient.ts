const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type FetchOptions = RequestInit & {
  headers?: Record<string, string>;
};

let authToken: string | null = null;

async function getAuthToken() {
  if (authToken) return authToken;

  // Try to register/login a demo user
  try {
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'demo_driver', password: 'password123', role: 'driver' })
    });

    if (regRes.status === 201 || regRes.status === 409) {
      const loginRes = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo_driver', password: 'password123' })
      });
      
      if (loginRes.ok) {
        const data = await loginRes.json();
        authToken = data.token;
        return authToken;
      }
    }
  } catch (e) {
    console.error("Auth failed", e);
  }
  return null;
}

export async function fetchClient<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { headers, ...rest } = options;

  // Ensure we have a token for protected endpoints
  // We skip auth for login/register to avoid infinite loops
  if (!endpoint.includes('/login') && !endpoint.includes('/register')) {
      await getAuthToken();
  }

  const config: RequestInit = {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
      ...headers,
    },
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    // Try to parse error message from JSON
    let errorMessage = `HTTP Error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // Ignore JSON parse error
    }
    console.log(errorMessage, "--------------------------")
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
