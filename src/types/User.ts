import { UserRole } from "@/app/generated/prisma/browser";

export interface LoginResponse {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_verified: boolean;
  created_at: Date;
}