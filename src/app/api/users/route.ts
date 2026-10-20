import { authGuard } from "@/lib/auth/guard";
import { userService } from "@/services/UserService";
import { PERMISSION } from "@/types/Roles";
import handleRouteError from "@/utils/handleRouteError";
import { NextRequest, NextResponse } from "next/server";

export async  function GET(request:NextRequest){
    try{
        const autherror=authGuard(request,{requirePermission:PERMISSION.READ_ALL_EMPLOYEES});
        if(autherror) return autherror;
        const mappedResult=await userService.getAllUsers();
      return NextResponse.json({
        success:true,
        data:mappedResult.users,
        meta:{
            total:mappedResult.total
        }
      },{status:200})
    }
    catch(error){
        return handleRouteError(error, {
            operation: 'GET /api/users',
            permissionMessage: 'You do not have permission to view users',
            itemNotFoundMessage: 'No users found',
        });
    }
    
}   