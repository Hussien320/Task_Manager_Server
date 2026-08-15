import { user_repo } from "@/repository/user_repo";
import bycrypt from "bcrypt";
import logger from "@/utils/logger";
import { ItemNotFoundException } from "@/utils/exceptions/RepoException";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { User } from "@/app/generated/prisma/browser";
import { auth_service } from "./auth_service";

export class User_Service {
    private static  isntnace:User_Service
   static getinstance():User_Service{
      if(!User_Service.isntnace){
         User_Service.isntnace=new User_Service();

      }
      return User_Service.isntnace;
   }
     
       async Update_VerfiedUser(email:string):Promise<void>{
          await user_repo.Update_Loged_User(email);
       }
  async ValidateUser(email:string,pass:string):Promise<User>{
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
}

export const user_serivice=User_Service.getinstance();
