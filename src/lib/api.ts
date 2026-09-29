import { LoginRequest, LoginResponse } from "@/types/User";
import { ApiException } from "@/utils/exceptions/ApiException";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(endpoint, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiException(
      data.message || `Request failed (${res.status})`,
      res.status,
      data.errorType,
      data.errors
    );
  }

  return data as T;
}

// ═══════════════════════════════════════════
// 3. API METHODS
// ═══════════════════════════════════════════
export const api = {
  auth: {
    login: (credentials: LoginRequest) =>
      request<{
        success: true;
        message: string;
        data: LoginResponse;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
       forgetpass:(email:string)=>
    request<{
      success:true,
     message:string,
      data:string
    }>('/api/auth/forgot-password',{
      method:'POST',
      body:JSON.stringify({ email })
    })
  
  },
 
};