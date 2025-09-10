import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/lib/api-client";

export type Permission = 
  | 'user.create'
  | 'user.read' 
  | 'user.update'
  | 'user.delete'
  | 'entity.create'
  | 'entity.read'
  | 'entity.update'
  | 'entity.delete'
  | 'apikey.create'
  | 'apikey.read'
  | 'apikey.delete'
  | 'admin.access';

const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    'user.create',
    'user.read',
    'user.update',
    'user.delete',
    'entity.create',
    'entity.read',
    'entity.update',
    'entity.delete',
    'apikey.create',
    'apikey.read',
    'apikey.delete',
    'admin.access',
  ],
  editor: [
    'entity.create',
    'entity.read',
    'entity.update',
    'entity.delete',
    'apikey.read',
  ],
  viewer: [
    'entity.read',
    'apikey.read',
  ],
};

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    const userPermissions = rolePermissions[user.role] || [];
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  const canAccessAdminPanel = (): boolean => {
    return hasPermission('admin.access');
  };

  const canManageUsers = (): boolean => {
    return hasAnyPermission(['user.create', 'user.update', 'user.delete']);
  };

  const canManageEntities = (): boolean => {
    return hasAnyPermission(['entity.create', 'entity.update', 'entity.delete']);
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  const isEditor = (): boolean => {
    return user?.role === 'editor';
  };

  const isViewer = (): boolean => {
    return user?.role === 'viewer';
  };

  return {
    user,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessAdminPanel,
    canManageUsers,
    canManageEntities,
    isAdmin,
    isEditor,
    isViewer,
  };
}