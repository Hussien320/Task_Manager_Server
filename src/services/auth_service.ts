
import crypto from 'crypto';
import bcrypt from "bcrypt"
import config from '@/lib/config';
import { UserPayload } from '@/types/tokenpayload';
import { AuthenticationException, ExpiredTokenException, InvalidTokenException, TokenNotFoundException } from '@/utils/exceptions/http/AuthenticationException';
import logger from '@/utils/logger';
import jwt from 'jsonwebtoken';
import ms from 'ms';
import { NextResponse } from 'next/server';
import { user_repo } from "@/repository/user_repo";


export class Auth_Service{
    private static isntance:Auth_Service;
    constructor(
        private accessSecret=config.auth.jwtSecret,
        private expiration=config.auth.expiration,
        private refreshSecret=config.auth.RefreshSecret,
        private refresh_expiration=config.auth.refreshExpiration,
        private reset_expiration=config.auth.resetExpiration

    ){}
    static getinstance():Auth_Service{
        if(!Auth_Service.isntance){
            Auth_Service.isntance=new Auth_Service();
        }
        return Auth_Service.isntance;
    }
 generateAccessToken(payload:UserPayload):string{
       return jwt.sign(payload,this.accessSecret,{expiresIn:this.expiration});
    }
    generateRefreshToken(payload:UserPayload):string{
        return jwt.sign(payload,this.refreshSecret,{expiresIn:this.refresh_expiration});

    }
    generateResetToken():{code:string,expiresAt:Date}{
          // Generate 6-digit code
    const min = 100000;
    const max = 999999;
    const code = crypto.randomInt(min, max + 1).toString();
    
    // Calculate expiration date (e.g., 15 minutes from now)
    const expiresAt = new Date(Date.now() + ms(this.reset_expiration));
    
    return { code, expiresAt };

    }
    valiadteAccesToken(token:string):UserPayload{
        try{
               return  jwt.verify(token,this.accessSecret) as UserPayload;
        }
        catch{
            logger.error('Invalid token');
            throw new AuthenticationException('invalid acces token');
        }
    }
    validateRefrshToken(token:string):UserPayload{
        try{
             return jwt.verify(token,this.refreshSecret) as UserPayload;
        }
        catch{
            throw new InvalidTokenException();
        }
    }
    
    setAccessCookie(res:NextResponse,token:string){
        res.cookies.set(
            'auth_token',token,{
                httpOnly:true,
                secure:config.is_Production,
                  sameSite: config.is_Production ? 'none' : 'lax',
            maxAge: ms(this.expiration)
            }
        )
    }
    setRefreshCookie(res:NextResponse,token:string){
        res.cookies.set(
            'refresh_token',
            token,
            {
                httpOnly:true,
                secure:config.is_Production,
                  sameSite: config.is_Production ? 'none' : 'lax',
            maxAge: ms(this.refresh_expiration)   
            }
            
        )
    }
    
    async persist_auth(res:NextResponse,payload:UserPayload){
        //genrate access and refresh token
        const accesstoken=this.generateAccessToken(payload);
        const refreshtoken=this.generateRefreshToken(payload);
        //genrate the cookies
        this.setAccessCookie(res,accesstoken);
        this.setRefreshCookie(res,refreshtoken);
        //hash the refresh to store into the db
         const hashed_refresh=await bcrypt.hash(refreshtoken,10);
        //save to db
       const exp=new Date(
  Date.now() + ms(this.refresh_expiration))
        await user_repo.Update_Refresh_token(payload.user_id,hashed_refresh,exp)

    }
    async persist_reset(res:NextResponse,payload:UserPayload){
        //genrate token
        const {code,expiresAt}=this.generateResetToken()
        //hash the code to store in db
        const hashed=await bcrypt.hash(code,10);
        //store it in db
        await user_repo.Update_Reset_token(payload.user_id,hashed,expiresAt);
        return code;
         
    }
    async verResetToken(email:string,providedtoken:string){
        const resetdata=await user_repo.GetByEmail(email);
        if(resetdata.reset_password_token==null){
        logger.error('no reset token');
        return false

      
        }
        //check expired date
        if(!resetdata.reset_password_expiresAt ||new Date()>resetdata.reset_password_expiresAt) {
            logger.error('expired token');
     
            return false

        }
         
        const isMatch=await bcrypt.compare(providedtoken,resetdata.reset_password_token);
        if(!isMatch){
            logger.error('wrong code')
         
            return false

    
        }
        return true;

    }
    async refresh(refreshtoken:string){
        //verfy the refreshto ken
        const payload=this.validateRefrshToken(refreshtoken);
        //see if the user  have this refresh token inside db
        const user=await user_repo.Get_User(payload.user_id);
        //check if user have the token or even exist
        if(!user || !user.refresh_token){
            logger.error('404');
         throw new TokenNotFoundException();

       
        }
        //check the date
        if(user.refresh_token_expires_at && new Date()>user.refresh_token_expires_at){
            logger.error('Token is expired');
            await user_repo.Update_Refresh_token(payload.user_id,null,null);
            throw new  ExpiredTokenException();

        }
        //compare if the token in cookie and user are the same
        const isMatch=await bcrypt.compare(refreshtoken,user.refresh_token);
        if(!isMatch){
            logger.error('Invalid refresh token');
            throw new InvalidTokenException();
        }
        //rotation
        const new_acces=this.generateAccessToken(payload);
        const new_refresh=this.generateRefreshToken(payload);
        
       
        //save in db
        const hasehed=await bcrypt.hash(new_refresh,10);
             const exp=new Date(
  Date.now() + ms(this.refresh_expiration))
        await user_repo.Update_Refresh_token(payload.user_id,hasehed,exp);
        return {new_acces,new_refresh};





    }
    async Logout(id:string){
        
        await user_repo.Update_Not_Verfied_User(id);

    }
   
    clearAuthCookies(response: NextResponse): void {
        // ✅ Delete auth_token by setting maxAge: 0
        response.cookies.set('auth_token', '', {
            httpOnly: true,
            secure: config.is_Production,
            sameSite: config.is_Production ? 'none' : 'lax',
            maxAge: 0,  // ← Delete immediately
            path: '/',
        });

        // ✅ Delete refresh_token by setting maxAge: 0
        response.cookies.set('refresh_token', '', {
            httpOnly: true,
            secure: config.is_Production,
            sameSite: config.is_Production ? 'none' : 'lax',
            maxAge: 0,  // ← Delete immediately
            path: '/',
        });
    }
}


export const auth_service=Auth_Service.getinstance();