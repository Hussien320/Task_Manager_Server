// src/types/roles.ts

// ============================================
// ROLES
// ============================================

export enum ROLE {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
}

// ============================================
// PERMISSIONS
// ============================================

export enum PERMISSION {
  // ==========================================
  // A. AUTHENTICATION (Both roles)
  // ==========================================
  LOGIN = 'auth:login',
  LOGOUT = 'auth:logout',
  FORGOT_PASSWORD = 'auth:forgot_password',
  VERIFY_RESET = 'auth:verify_reset',
  RESET_PASSWORD = 'auth:reset_password',

  // ==========================================
  // B. EMPLOYEE PERMISSIONS 
  // ==========================================
  
  // B.1 Add Product (FR A.2)
  CREATE_PRODUCT = 'product:create',
  READ_PRODUCT = 'product:read',
  
  // B.2 Withdraw Product (FR A.4)
  WITHDRAW_PRODUCT = 'product:withdraw',
  
  // B.3 Select Supplier (FR A.3)
  READ_SUPPLIER = 'supplier:read',

  // ==========================================
  // C. MANAGER PERMISSIONS 
  // ==========================================
  
  // C.1 Supplier Management 
  CREATE_SUPPLIER = 'supplier:create',
  UPDATE_SUPPLIER = 'supplier:update',
  DELETE_SUPPLIER = 'supplier:delete',
  READ_ALL_SUPPLIERS = 'supplier:read:all',
 
  
  // C.2 Employee Management 
  CREATE_EMPLOYEE = 'employee:create',
  READ_EMPLOYEE = 'employee:read',
  UPDATE_EMPLOYEE = 'employee:update',
  DELETE_EMPLOYEE = 'employee:delete',
  READ_ALL_EMPLOYEES = 'employee:read:all',
  
  // C.3 View All Stock 
  READ_ALL_PRODUCTS = 'product:read:all',
  
  // C.4 Search Product 
  SEARCH_PRODUCT = 'product:search',
  
  // C.5 Edit Product Attributes (FR B.3)
  UPDATE_PRODUCT = 'product:update',
  
  // C.6 Set Low-Stock Threshold (FR B.3)
  SET_THRESHOLD = 'product:set_threshold',
  
  // C.7 Track Product Changes (FR B.7)
  READ_INVENTORY_LOGS = 'inventory:read',
  

  
  // C.10 Low-Stock Alert 
  READ_LOW_STOCK_ALERTS = 'alert:low_stock:read',
  
  // C.11 Expiry Alert 
  READ_EXPIRY_ALERTS = 'alert:expiry:read',
  
  // C.12 App Settings 
  UPDATE_APP_SETTINGS = 'app_settings:update',
  READ_APP_SETTINGS = 'app_settings:read',
}

// ============================================
// ROLE PERMISSIONS MAPPING
// ============================================

type RolePermissions = {
  [key in ROLE]: PERMISSION[];
};

export const ROLE_PERMISSIONS: RolePermissions = {
  // ==========================================
  // ADMIN (Manager) - Full Access
  // ==========================================
  [ROLE.ADMIN]: [
    // Authentication
    PERMISSION.LOGIN,
    PERMISSION.LOGOUT,
    PERMISSION.FORGOT_PASSWORD,
    PERMISSION.VERIFY_RESET,
    PERMISSION.RESET_PASSWORD,

    // Supplier Management (CRUD)
    PERMISSION.CREATE_SUPPLIER,
    PERMISSION.READ_ALL_SUPPLIERS,
    PERMISSION.UPDATE_SUPPLIER,
    PERMISSION.DELETE_SUPPLIER,
    PERMISSION.READ_SUPPLIER,
    

    // Employee Management (CRUD)
    PERMISSION.CREATE_EMPLOYEE,
    PERMISSION.READ_ALL_EMPLOYEES,
    PERMISSION.READ_EMPLOYEE,
    PERMISSION.UPDATE_EMPLOYEE,
    PERMISSION.DELETE_EMPLOYEE,

    // Product Management
    PERMISSION.CREATE_PRODUCT,
    PERMISSION.READ_ALL_PRODUCTS,
    PERMISSION.READ_PRODUCT,
    PERMISSION.UPDATE_PRODUCT,
    PERMISSION.WITHDRAW_PRODUCT,
    PERMISSION.SEARCH_PRODUCT,
    PERMISSION.SET_THRESHOLD,

    // Inventory & Tracking
    PERMISSION.READ_INVENTORY_LOGS,

    // Reports & Alerts
  
    PERMISSION.READ_LOW_STOCK_ALERTS,
    PERMISSION.READ_EXPIRY_ALERTS,

    // App Settings
    PERMISSION.READ_APP_SETTINGS,
    PERMISSION.UPDATE_APP_SETTINGS,
  ],

  // ==========================================
  // EMPLOYEE - Limited Access
  // ==========================================
  [ROLE.EMPLOYEE]: [
    // Authentication
    PERMISSION.LOGIN,
    PERMISSION.LOGOUT,
    PERMISSION.FORGOT_PASSWORD,
    PERMISSION.VERIFY_RESET,
    PERMISSION.RESET_PASSWORD,

    // Product Operations
    PERMISSION.CREATE_PRODUCT,
    PERMISSION.READ_PRODUCT,
    PERMISSION.WITHDRAW_PRODUCT,

    // Supplier (Read only - for dropdown selection)
    PERMISSION.READ_SUPPLIER,

    // Employee can read their own profile (not others)
    PERMISSION.READ_EMPLOYEE,

    // Limited inventory view (their own changes)
    PERMISSION.READ_INVENTORY_LOGS,
  ],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function toRole(role: string): ROLE {
  const roleMap: Record<string, ROLE> = {
    'admin': ROLE.ADMIN,
    'employee': ROLE.EMPLOYEE,
  };
  
  const mappedRole = roleMap[role.toLowerCase()];
  if (!mappedRole) {
    throw new Error(`Invalid role: ${role}`);
  }
  return mappedRole;
}

export function hasPermission(
  userRole: ROLE,
  permission: PERMISSION
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions.includes(permission);
}

export function hasAnyPermission(
  userRole: ROLE,
  permissions: PERMISSION[]
): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

export function hasAllPermissions(
  userRole: ROLE,
  permissions: PERMISSION[]
): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

export function getPermissionsForRole(role: ROLE): PERMISSION[] {
  return ROLE_PERMISSIONS[role] || [];
}