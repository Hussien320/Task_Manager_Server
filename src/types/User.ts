import { UserRole } from "@/app/generated/prisma/browser";
import { User } from "@/app/generated/prisma/client";

export interface LoginResponse {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_verified: boolean;
  created_at: string;
}
export interface UserResponse {
  name: string;
  email: string;
  role: UserRole;
  is_verified: boolean;
}
export interface UserListResponse {
  users: UserResponse[];
  total: number;
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
export function toUserResponse(user:User):UserResponse{
  return{
    name:user.username,
    email:user.email,
    role:user.role,
    is_verified:user.is_verified
  }
  
}
export function toUserListResponse(users:User[]):UserListResponse{
  const userResponses=users.map(user=>toUserResponse(user));
  return{
    users:userResponses,
    total:users.length
  }
}
