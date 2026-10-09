import { CreateProductRequest,ProductResponse, WithdrawProductRequest } from "@/types/Product";
import { SupplierListResponse } from "@/types/Supplier";
import { LoginRequest, LoginResponse, VerifyResetRequest } from "@/types/User";
import { ApiException } from "@/utils/exceptions/ApiException";

function cleanErrorMessage(rawMessage: string): string {
  // Strip any "SomethingException: " prefix
  return rawMessage.replace(/^[A-Za-z]+Exception:\s*/, '');
}
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
      const rawMessage = data.message || `Request failed (${res.status})`;
    const cleanMessage = cleanErrorMessage(rawMessage);
    throw new ApiException(
       cleanMessage,
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
    logout: () =>
      request<{
        success: true;
        message: string;
      }>('/api/auth/logout', {
        method: 'POST',
      }),
    forgetpass:(email:string)=>
    request<{
      message: string;
    }>('/api/auth/forgot-password',{
      method:'POST',
      body:JSON.stringify({ email })
    }),
    verifyReset: (credentials: VerifyResetRequest) =>
  request<{
    success: true;
    message: string;
  }>('/api/auth/verify-reset', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  
  },
  products:{
    add:(credentials:CreateProductRequest)=>
    request<{
      success: true;
      message: string;
      data: ProductResponse;
    }>('/api/products',{
      method:'POST',
      body:JSON.stringify(credentials)
    }),
    withdraw:(credentials:WithdrawProductRequest)=>
    request<{
      success: true;
      message: string;
      data:ProductResponse;
    }>('/api/products/withdraw',{
      method:'POST',
      body:JSON.stringify(credentials)
    }),
    getByName: (name: string) =>
    request<{
      success: true;
      data: ProductResponse;
    }>(`/api/products/by-name?name=${encodeURIComponent(name)}`, {
      method: 'GET',
    }),
    reload:(id:string, quantity:number)=>
    request<{
      success: true;
      message: string;
      data:ProductResponse;
    }>(`/api/products/${id}/reload`,{
      method:'PUT',
      body:JSON.stringify({ quantity })
    }),
   
  },
  suppliers:{
    getactive:()=>
      request<{
        success: true;
        message: string;
        data:SupplierListResponse;
      }>('/api/suppliers/active_suppliers',{
        method:'GET'
      })


  }
 
};
