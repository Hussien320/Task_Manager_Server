import { id, IRepo } from "@/Repository/IRepo";
 import { User, UserRole } from "@/app/generated/prisma/browser";
import { prisma } from "@/lib/db";
export class User_Repo implements IRepo<User> {
   async  create(item: { id: string; username: string; email: string; pass_hash: string; role: UserRole; is_verified: boolean; last_login: Date | null; reset_password_token: string | null; reset_password_expiresAt: Date | null; refresh_token: string | null; refresh_token_expires_at: Date | null; created_at: Date; updated_at: Date; }): Promise<id> {
        throw new Error("Method not implemented.");
    }
    async GetById(id: id): Promise<{ id: string; username: string; email: string; pass_hash: string; role: UserRole; is_verified: boolean; last_login: Date | null; reset_password_token: string | null; reset_password_expiresAt: Date | null; refresh_token: string | null; refresh_token_expires_at: Date | null; created_at: Date; updated_at: Date; }> {
        throw new Error("Method not implemented.");
    }
    async GetAll(): Promise<{ id: string; username: string; email: string; pass_hash: string; role: UserRole; is_verified: boolean; last_login: Date | null; reset_password_token: string | null; reset_password_expiresAt: Date | null; refresh_token: string | null; refresh_token_expires_at: Date | null; created_at: Date; updated_at: Date; }[]> {
        throw new Error("Method not implemented.");
    }
    
    async Update(u:User):Promise<id>{ 
        throw new Error("Method not implemented.");
    }
  
    async Delete(id: id): Promise<void> {
        throw new Error("Method not implemented.");
    }
    async GetByEmail(email:string):Promise<User>{
        try{
            const targetUser = await prisma.user.findUnique({
                where: {
                    email: email.trim().toLowerCase(),  
                }
            });

            if (!targetUser) {
                throw new Error("User not found");
            }

            return targetUser;
        }
        catch(err){
            throw err
        }

    }
    async Update_Loged_User(email:string):Promise<void>{
        try{
            await prisma.user.update({
                where: {
                    email: email.trim().toLowerCase(),
                },
                data: {
                    last_login: new Date(),
                    is_verified: true,
                },
            });
        }
        catch(err){
            throw err
        }
    }

    


}