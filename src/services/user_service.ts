import { User_Repo } from "@/repository/user_repo";
import bycrypt from "bcrypt";
import logger from "@/utils/logger";
import { ItemNotFoundException } from "@/utils/exceptions/RepoException";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { User } from "@/app/generated/prisma/browser";
export class User_Service {
    static async Login(email:string,password:string):Promise<User>{
       //see if user exists
          const targetUser = await User_Repo.GetByEmail(email);
        
         if (!targetUser) {
      throw new ItemNotFoundException("User not found");
    }
    //compare pass
    if (!bycrypt.compareSync(password, targetUser.pass_hash || "")) {
      logger.warn("Login attempt failed: Invalid credentials");
      throw new BadRequestException("Bad request: invalid email or password");
    }
    //genenrate the accestoken and refresh token

    
    //update the loged in user

    await User_Repo.Update_Loged_User(targetUser.email);
    return targetUser;
       }
      
}
