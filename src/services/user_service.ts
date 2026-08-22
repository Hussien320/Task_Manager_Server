import { user_repo } from "@/repository/user_repo";
import bycrypt from "bcrypt";
import logger from "@/utils/logger";
import { ItemNotFoundException } from "@/utils/exceptions/RepoException";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { User } from "@/app/generated/prisma/browser";


export class User_Service {
    private static  instance:User_Service
   static getinstance():User_Service{
      if(!User_Service.instance){
         User_Service.instance=new User_Service();

      }
      return User_Service.instance;
   }
     
       async Update_VerfiedUser(email:string):Promise<User>{
          const updated_user=await user_repo.Update_Loged_User(email);
          return updated_user;
       }
  async ValidateUser(email:string,pass:string ):Promise<User>{
       const targetUser = await user_repo.GetByEmail(email);
        
         if (!targetUser) {
      throw new ItemNotFoundException("User not found");
    }
    //compare pass
    if (!bycrypt.compareSync(pass, targetUser.pass_hash || "")) {
      logger.warn("Login attempt failed: Invalid credentials");
      throw new BadRequestException("Bad request: invalid email or password");
    }
    return targetUser;
}    
   async GetUser_ByEmail(email:string):Promise<User>{
      const user=await user_repo.GetByEmail(email);
      if(!user){
         logger.error('User not found');
         throw new ItemNotFoundException('user not found');
      }
      return user;
   }
   async Update_Pass(email:string,pass:string){
      await user_repo.Update_User_Pass(email,pass);
   }
}

export const user_serivice=User_Service.getinstance();
