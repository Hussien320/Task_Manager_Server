import { NextResponse } from "next/server";

import {
    AuthorizationException,
    InsufficientPermissionsException,
    InvalidRoleException
} from "@/utils/exceptions/http/AuthorizationException";
import { AuthenticationException } from "@/utils/exceptions/http/AuthenticationException";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import { DBException, ItemExists, ItemNotFoundException } from "@/utils/exceptions/RepoException";
import logger from "@/utils/logger";

/**
 * Per-route wording for the shared error handler.
 * Everything is optional — omit it and the generic message is used.
 */
export type RouteErrorContext = {
    /** What the route was doing ("addition", "update", "login"...). Used in logs and the DB error message. */
    operation?: string;
    /** 403 message when the role is valid but the permission is missing. */
    permissionMessage?: string;
    /** 400 message when the resource already exists. */
    itemExistsMessage?: string;
};

/**
 * Turns a thrown exception into the JSON error response for an API route.
 *
 * Subclasses are checked before their parents (InvalidRoleException and
 * InsufficientPermissionsException both extend AuthorizationException), so the
 * order of the checks below matters.
 *
 * @example
 * catch (error) {
 *     return handleRouteError(error, {
 *         operation: 'addition',
 *         permissionMessage: 'You do not have permission to add suppliers',
 *     });
 * }
 */
export function handleRouteError(
    error: unknown,
    context: RouteErrorContext = {}
): NextResponse {
    const {
        operation = 'request',
        permissionMessage = 'You do not have permission to perform this action',
        itemExistsMessage = 'Item already exists'
    } = context;

    // ============================================
    // HANDLE AUTHORIZATION / AUTHENTICATION
    // ============================================

    // ✅ Invalid role (role doesn't exist in system)
    if (error instanceof InvalidRoleException) {
        logger.error(`Invalid role: ${error.message}`);
        return NextResponse.json(
            {
                success: false,
                message: 'Invalid user role',
                errorType: 'InvalidRoleException'
            },
            { status: 403 }
        );
    }

    // ✅ Insufficient permissions (valid role but missing permission)
    if (error instanceof InsufficientPermissionsException) {
        logger.warn(`Permission denied: ${error.message}`);
        return NextResponse.json(
            {
                success: false,
                message: permissionMessage,
                errorType: 'InsufficientPermissionsException'
            },
            { status: 403 }
        );
    }

    // ✅ Authorization error (wrong role for route)
    if (error instanceof AuthorizationException) {
        logger.warn(`Authorization failed: ${error.message}`);
        return NextResponse.json(
            {
                success: false,
                message: error.message || 'Authorization failed',
                errorType: 'AuthorizationException'
            },
            { status: 403 }
        );
    }

    // ✅ Authentication error (token invalid/expired)
    if (error instanceof AuthenticationException) {
        logger.warn(`Authentication failed: ${error.message}`);
        return NextResponse.json(
            {
                success: false,
                message: 'Authentication failed. Please login again.',
                errorType: 'AuthenticationException'
            },
            { status: 401 }
        );
    }

    // ============================================
    // HANDLE REPOSITORY EXCEPTIONS
    // ============================================

    // ✅ Resource already exists
    if (error instanceof ItemExists) {
        logger.warn(`Item already exists during ${operation}`);
        return NextResponse.json(
            {
                success: false,
                message: itemExistsMessage,
                errorType: 'ItemExists'
            },
            { status: 400 }
        );
    }

    // ✅ Item not found
    if (error instanceof ItemNotFoundException) {
        logger.warn(`Item not found: ${error.message}`);
        return NextResponse.json(
            {
                success: false,
                message: error.message || 'Resource not found',
                errorType: 'ItemNotFoundException'
            },
            { status: 404 }
        );
    }

    // ============================================
    // HANDLE VALIDATION
    // ============================================

    // ✅ Validation / business rule failure
    if (error instanceof BadRequestException) {
        logger.warn(error.name + ": " + error.message);
        return NextResponse.json(
            {
                success: false,
                message: error.name + ": " + error.message,
                errors: error.details?.errors || error.details, // ← Include details
                errorType: 'BadRequestException'
            },
            { status: 400 }
        );
    }

    // ✅ Database error
    if (error instanceof DBException) {
        logger.error(`Database error during ${operation}: ${error.message}`, error);
        return NextResponse.json(
            {
                success: false,
                message: `Database error while processing ${operation}`,
                errorType: 'DBException'
            },
            { status: 500 }
        );
    }

    // ============================================
    // HANDLE UNKNOWN ERRORS
    // ============================================

    logger.error(`${operation} route failed`, error);
    return NextResponse.json(
        {
            success: false,
            message: 'Internal server error',
            errorType: 'UnknownError'
        },
        { status: 500 }
    );
}

export default handleRouteError;
