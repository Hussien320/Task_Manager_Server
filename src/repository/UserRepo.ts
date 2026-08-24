
 import { User } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";

import { DBException, ItemNotFoundException } from "@/utils/exceptions/RepoException"

export  class UserRepo{
    private static instance:UserRepo;
    static getInstance():UserRepo{
        if(!UserRepo.instance){
            UserRepo.instance=new UserRepo();
        }
        return UserRepo.instance;
    }
       async getByEmail(email:string):Promise<User>{
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
    async updateLoggedInUser(email:string):Promise<User>{
        try{
     const updatedUser=       await prisma.user.update({
                where: {
                    email: email.trim().toLowerCase(),
                },
                data: {
                    last_login: new Date(),
                    is_verified: true,
                },
            });
            return updatedUser
        }
        catch(err){

            throw new DBException("Error updating logged-in user", err as Error);
        }
    }
    async updateRefreshToken(userId:string,token:string | null,expiryDate:Date | null):Promise<void>{
        try{
            await prisma.user.update({
                where: { id: userId },
                data: {
                    refresh_token: token,
                    refresh_token_expires_at: expiryDate
                    ,
                },
            });

        }
        catch(err){
            throw new DBException('ERRO updating refersh token',err as Error);

        }
    }
    async updateResetToken(userId:string,token:string | null,expiryDate:Date | null):Promise<void>{
        try{
            await  prisma.user.update({
                where:{id:userId},
                data:{
                      reset_password_token :token,
                        reset_password_expiresAt:expiryDate
                }

            });
        }
        catch(err){
            throw new DBException('ERRO updating refersh token',err as Error);

        }
        }
    async getUser(userId:string):Promise<User>{
     try{
        const target=await prisma.user.findUnique({
            where:{
                id:userId
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
     async updateUserPassword(email:string,pass:string):Promise<void>{
        try{
        await prisma.user.update({
            where:{
                email:email.trim().toLowerCase()
            },
            data:{
                pass_hash:pass,
                reset_password_token:null,
                reset_password_expiresAt:null
            }
        })
        }
        catch(err){
            throw new DBException("Error updating user password", err as Error);
        }

     }
 async updateNotVerifiedUser(userId:string){

        await prisma.user.update({
            where:{
                id:userId
            },
            data:{
                is_verified:false,
                refresh_token:null,
                refresh_token_expires_at:null
            }
        })
        }


}
export const userRepo=UserRepo.getInstance();
