import { userRepo } from "@/repository/UserRepo";
import bcrypt from "bcrypt";
import logger from "@/utils/logger";
import { ItemNotFoundException } from "@/utils/exceptions/RepoException";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { User } from "@/app/generated/prisma/browser";
import { toUserListResponse, UserListResponse } from "@/types/User";



export class UserService {
    private static  instance:UserService
   static getInstance():UserService{
      if(!UserService.instance){
         UserService.instance=new UserService();

      }
      return UserService.instance;
   }

       async updateVerifiedUser(email:string):Promise<User>{
          const updatedUser=await userRepo.updateLoggedInUser(email);
          return updatedUser;
       }
  async validateUser(email:string,pass:string ):Promise<User>{
       const targetUser = await userRepo.getByEmail(email);

         if (!targetUser) {
      throw new ItemNotFoundException("User not found");
    }
    //compare pass
    if (!bcrypt.compareSync(pass, targetUser.pass_hash || "")) {
      logger.warn("Login attempt failed: Invalid credentials");
      throw new BadRequestException("Bad request: invalid email or password");
    }
    return targetUser;
}
   async getUserByEmail(email:string):Promise<User>{
      const user=await userRepo.getByEmail(email);
      if(!user){
         logger.error('User not found');
         throw new ItemNotFoundException('user not found');
      }
      return user;
   }
   async getAllUsers():Promise<UserListResponse>
   {
      const users=await userRepo.GetAllUsers();
      if(!users || users.length===0){
         throw new ItemNotFoundException('No users found');
      }
      const mappedResponse=toUserListResponse(users);
      return mappedResponse;
   }
   async updatePassword(email:string,pass:string){
      await userRepo.updateUserPassword(email,pass);
   }

  
}

export const userService=UserService.getInstance();
