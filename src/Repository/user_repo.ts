
 import { User } from "@/app/generated/prisma/browser";
import { prisma } from "@/lib/db";
import { InvalidTokenException } from "@/utils/exceptions/http/AuthenticationException";
import { DBException, ItemNotFoundException } from "@/utils/exceptions/RepoException"
import { use } from "react";
export  class User_Repo{
    private static instance:User_Repo;
    static getinstance():User_Repo{
        if(!User_Repo.instance){
            User_Repo.instance=new User_Repo();
        }
        return User_Repo.instance;
    }
       async GetByEmail(email:string):Promise<User>{
        try{
            const targetUser = await prisma.user.findUnique({
                where: {
                    email: email.trim().toLowerCase(),  
                }
            });

            if (!targetUser) {
                throw new ItemNotFoundException(`User with email ${email} not found`);
            }

            return targetUser;
        }
        catch(err){
            if (err instanceof ItemNotFoundException) {
                throw err; // Re-throw the ItemNotFoundException
            }
            throw new DBException("Error retrieving user by email", err as Error);
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
           
            throw new DBException("Error updating logged-in user", err as Error);
        }
    }
    async Update_Refresh_token(user_id:string,token:string | null,expiraydate:Date | null):Promise<void>{
        try{
            await prisma.user.update({
                where: { id: user_id },
                data: {
                    refresh_token: token,
                    refresh_token_expires_at: expiraydate
                    ,
                },
            });

        }
        catch(err){
            throw new DBException('ERRO updating refersh token',err as Error);

        }
    }
    async Get_User(user_id:string):Promise<User>{
     try{
        const target=await prisma.user.findUnique({
            where:{
                id:user_id
            }
        })
        if(!target){
            throw new ItemNotFoundException('user not found');
        }
        return target;
     }  catch(err){
        if(err instanceof ItemNotFoundException){
            throw err
        }
        throw new DBException('Failed in getting user',err as Error);

     } 
    }
    


}
export const user_repo=User_Repo.getinstance();