import prisma from "@/lib/db";
import { NextRequest } from "next/server";
import bycrypt from "bcrypt";
import logger from "@/utils/logger";
export async function POST(request: NextRequest) {
   const {email,password}=await request.json();
   //check if the user exists
   const target_user=await prisma.user.findUnique({
      where:{
         email:email
      }
   });
   if(!target_user){
    logger.warn("Login attempt failed: User not found");
    return new Response(JSON.stringify({message:"User not found"}),{status:404});
   }
   //compare the password
   if(!bycrypt.compareSync(password,target_user.pass_hash||password)){
    logger.warn("Login attempt failed: Invalid credentials");
    return new Response(JSON.stringify({message:"Invalid credentials"}),{status:401});
   }
   //set userdata verfy to true
 const updateUser = await prisma.user.update({
  where: { email: target_user.email },
  data: { is_verified: true },
   select: {
        id: true,
        username: true,
        email: true,
        role: true,
        is_verified: true,
        created_at: true,
      }
});
logger.info(`User ${updateUser.email} logged in successfully`);
return new Response(JSON.stringify({message:"Login successful",data:{user:updateUser}}),{status:200});
    



}