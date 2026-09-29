import { UserRole } from "@/app/generated/prisma/browser";

export interface LoginResponse {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_verified: boolean;
  created_at: string;
}
export interface LoginRequest{
  email:string,
  password:string
}

 export interface VerifyResetRequest  {
  email: string;
  token: string;
  password: string;
};
