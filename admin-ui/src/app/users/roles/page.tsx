"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield,
  Users,
  Edit,
  Eye,
  Key,
  Database,
  Settings,
  CheckCircle,
  XCircle,
  User,
  Crown,
  Briefcase,
} from "lucide-react";
import { UserRole } from "@/lib/api-client";
import { usePermissions } from "@/hooks/usePermissions";

const roleDetails: Record<UserRole, {
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  permissions: {
    category: string;
    items: {
      name: string;
      description: string;
      granted: boolean;
    }[];
  }[];
}> = {
  admin: {
    name: "Administrator",
    description: "Full system access with all permissions",
    icon: Crown,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    permissions: [
      {
        category: "User Management",
        items: [
          { name: "Create Users", description: "Invite and create new user accounts", granted: true },
          { name: "View Users", description: "View all user profiles and information", granted: true },
          { name: "Update Users", description: "Edit user profiles and settings", granted: true },
          { name: "Delete Users", description: "Remove users from the system", granted: true },
          { name: "Manage Roles", description: "Assign and modify user roles", granted: true },
        ]
      },
      {
        category: "Entity Management", 
        items: [
          { name: "Create Entities", description: "Create new API entities and schemas", granted: true },
          { name: "View Entities", description: "View all entities and their configurations", granted: true },
          { name: "Update Entities", description: "Modify existing entities and schemas", granted: true },
          { name: "Delete Entities", description: "Remove entities from the system", granted: true },
        ]
      },
      {
        category: "API Management",
        items: [
          { name: "Create API Keys", description: "Generate new API keys", granted: true },
          { name: "View API Keys", description: "View all API keys and usage", granted: true },
          { name: "Revoke API Keys", description: "Disable and remove API keys", granted: true },
          { name: "Manage Rate Limits", description: "Configure API rate limiting", granted: true },
        ]
      },
      {
        category: "System Administration",
        items: [
          { name: "System Settings", description: "Access system configuration", granted: true },
          { name: "View Analytics", description: "Access usage analytics and reports", granted: true },
          { name: "Security Settings", description: "Manage security configurations", granted: true },
          { name: "Export Data", description: "Export system data and reports", granted: true },
        ]
      }
    ]
  },
  editor: {
    name: "Editor",
    description: "Content creation and management permissions",
    icon: Briefcase,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    permissions: [
      {
        category: "User Management",
        items: [
          { name: "Create Users", description: "Invite and create new user accounts", granted: false },
          { name: "View Users", description: "View all user profiles and information", granted: false },
          { name: "Update Users", description: "Edit user profiles and settings", granted: false },
          { name: "Delete Users", description: "Remove users from the system", granted: false },
          { name: "Manage Roles", description: "Assign and modify user roles", granted: false },
        ]
      },
      {
        category: "Entity Management",
        items: [
          { name: "Create Entities", description: "Create new API entities and schemas", granted: true },
          { name: "View Entities", description: "View all entities and their configurations", granted: true },
          { name: "Update Entities", description: "Modify existing entities and schemas", granted: true },
          { name: "Delete Entities", description: "Remove entities from the system", granted: true },
        ]
      },
      {
        category: "API Management",
        items: [
          { name: "Create API Keys", description: "Generate new API keys", granted: false },
          { name: "View API Keys", description: "View all API keys and usage", granted: true },
          { name: "Revoke API Keys", description: "Disable and remove API keys", granted: false },
          { name: "Manage Rate Limits", description: "Configure API rate limiting", granted: false },
        ]
      },
      {
        category: "System Administration",
        items: [
          { name: "System Settings", description: "Access system configuration", granted: false },
          { name: "View Analytics", description: "Access usage analytics and reports", granted: true },
          { name: "Security Settings", description: "Manage security configurations", granted: false },
          { name: "Export Data", description: "Export system data and reports", granted: true },
        ]
      }
    ]
  },
  viewer: {
    name: "Viewer",
    description: "Read-only access to system resources",
    icon: Eye,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    permissions: [
      {
        category: "User Management",
        items: [
          { name: "Create Users", description: "Invite and create new user accounts", granted: false },
          { name: "View Users", description: "View all user profiles and information", granted: false },
          { name: "Update Users", description: "Edit user profiles and settings", granted: false },
          { name: "Delete Users", description: "Remove users from the system", granted: false },
          { name: "Manage Roles", description: "Assign and modify user roles", granted: false },
        ]
      },
      {
        category: "Entity Management",
        items: [
          { name: "Create Entities", description: "Create new API entities and schemas", granted: false },
          { name: "View Entities", description: "View all entities and their configurations", granted: true },
          { name: "Update Entities", description: "Modify existing entities and schemas", granted: false },
          { name: "Delete Entities", description: "Remove entities from the system", granted: false },
        ]
      },
      {
        category: "API Management",
        items: [
          { name: "Create API Keys", description: "Generate new API keys", granted: false },
          { name: "View API Keys", description: "View all API keys and usage", granted: true },
          { name: "Revoke API Keys", description: "Disable and remove API keys", granted: false },
          { name: "Manage Rate Limits", description: "Configure API rate limiting", granted: false },
        ]
      },
      {
        category: "System Administration",
        items: [
          { name: "System Settings", description: "Access system configuration", granted: false },
          { name: "View Analytics", description: "Access usage analytics and reports", granted: true },
          { name: "Security Settings", description: "Manage security configurations", granted: false },
          { name: "Export Data", description: "Export system data and reports", granted: false },
        ]
      }
    ]
  }
};

export default function RoleManagementPage() {
  const { user, isAdmin } = usePermissions();

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500">
            You don't have permission to view role management
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Role Management</h1>
        <p className="text-gray-500 mt-1">
          Understand and manage user roles and permissions
        </p>
      </div>

      {/* Current User Role */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                Your Current Role
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
                </Badge>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {roleDetails[user?.role as UserRole]?.description}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(Object.keys(roleDetails) as UserRole[]).map((role) => {
          const details = roleDetails[role];
          const Icon = details.icon;
          
          return (
            <Card key={role} className="relative">
              <CardHeader className={`pb-4 ${details.bgColor}`}>
                <div className="flex items-center gap-3">
                  <Icon className={`h-6 w-6 ${details.color}`} />
                  <div>
                    <CardTitle className="text-lg">{details.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {details.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-4">
                <div className="space-y-4">
                  {details.permissions.map((category, idx) => (
                    <div key={idx}>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {category.category}
                      </h4>
                      <div className="space-y-1">
                        {category.items.map((permission, permIdx) => (
                          <div key={permIdx} className="flex items-center gap-2">
                            {permission.granted ? (
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${permission.granted ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
                                {permission.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Role Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Comparison</CardTitle>
          <CardDescription>
            Compare permissions across different roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Permission</th>
                  <th className="text-center p-3 font-medium">Admin</th>
                  <th className="text-center p-3 font-medium">Editor</th>
                  <th className="text-center p-3 font-medium">Viewer</th>
                </tr>
              </thead>
              <tbody>
                {roleDetails.admin.permissions.map(category => 
                  category.items.map((permission, idx) => (
                    <tr key={`${category.category}-${idx}`} className="border-b">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-sm">{permission.name}</p>
                          <p className="text-xs text-gray-500">{permission.description}</p>
                        </div>
                      </td>
                      <td className="text-center p-3">
                        <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                      </td>
                      <td className="text-center p-3">
                        {roleDetails.editor.permissions
                          .find(cat => cat.category === category.category)
                          ?.items.find(item => item.name === permission.name)
                          ?.granted ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" />
                        )}
                      </td>
                      <td className="text-center p-3">
                        {roleDetails.viewer.permissions
                          .find(cat => cat.category === category.category)
                          ?.items.find(item => item.name === permission.name)
                          ?.granted ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Role Assignment Best Practices</CardTitle>
          <CardDescription>
            Guidelines for assigning roles to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 text-green-700 dark:text-green-300">
                ✅ Recommended Practices
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Assign the minimum role required for users to perform their job functions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Use Editor role for content creators who need to manage entities</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Reserve Admin role for trusted personnel only</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Regularly review and audit user roles</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Use Viewer role for stakeholders who only need to monitor</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3 text-red-700 dark:text-red-300">
                ❌ Things to Avoid
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>Don't assign Admin role to all users "just to be safe"</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>Avoid keeping inactive users with high-privilege roles</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>Don't share admin accounts between multiple people</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>Avoid granting permissions without understanding their impact</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>Don't forget to remove roles when users change responsibilities</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}