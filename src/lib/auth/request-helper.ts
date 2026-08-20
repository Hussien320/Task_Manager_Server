// src/lib/auth/request-helper.ts
import { NextRequest } from 'next/server';
import { ROLE, toRole } from '@/types/roles';

export function getUserIdFromRequest(request: NextRequest): string | null {
    return request.headers.get('x-user-id');
}

export function getUserRoleFromRequest(request: NextRequest): ROLE | null {
    const roleHeader = request.headers.get('x-user-role');
    if (!roleHeader) return null;
    
    try {
        return toRole(roleHeader);
    } catch {
        return null;
    }
}

export function getUserFromRequest(request: NextRequest): {
    userId: string;
    role: ROLE;
} | null {
    const userId = getUserIdFromRequest(request);
    const role = getUserRoleFromRequest(request);
    
    if (!userId || !role) return null;
    
    return { userId, role };
}