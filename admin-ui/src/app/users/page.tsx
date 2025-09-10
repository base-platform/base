"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Users, 
  Search,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  UserCheck,
  UserX,
  Calendar,
  Filter,
  Download
} from "lucide-react";
import { apiClient, User, UserRole } from "@/lib/api-client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidingPanel } from "@/components/ui/sliding-panel";
import { Label } from "@/components/ui/label";

// Mock data - in real implementation, this would come from the API
const mockUsers: User[] = [
  {
    id: "1",
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    name: "Admin User",
    role: "admin",
    isActive: true,
    emailVerified: true,
    lastLoginAt: "2025-09-08T15:30:00Z",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-09-08T15:30:00Z",
  },
  {
    id: "2",
    email: "sarah.johnson@example.com",
    firstName: "Sarah",
    lastName: "Johnson",
    name: "Sarah Johnson",
    role: "admin",
    isActive: true,
    emailVerified: true,
    lastLoginAt: "2025-09-08T09:45:00Z",
    createdAt: "2025-01-15T00:00:00Z",
    updatedAt: "2025-09-08T09:45:00Z",
  },
  {
    id: "3",
    email: "mike.chen@example.com",
    firstName: "Mike",
    lastName: "Chen",
    name: "Mike Chen",
    role: "editor",
    isActive: true,
    emailVerified: true,
    lastLoginAt: "2025-09-07T14:22:00Z",
    createdAt: "2025-02-08T00:00:00Z",
    updatedAt: "2025-09-07T14:22:00Z",
  },
  {
    id: "4",
    email: "emma.williams@example.com",
    firstName: "Emma",
    lastName: "Williams",
    name: "Emma Williams",
    role: "editor",
    isActive: true,
    emailVerified: true,
    lastLoginAt: "2025-09-08T11:18:00Z",
    createdAt: "2025-02-20T00:00:00Z",
    updatedAt: "2025-09-08T11:18:00Z",
  },
  {
    id: "5",
    email: "alex.rodriguez@example.com",
    firstName: "Alex",
    lastName: "Rodriguez",
    name: "Alex Rodriguez",
    role: "editor",
    isActive: false,
    emailVerified: true,
    lastLoginAt: "2025-08-15T16:30:00Z",
    createdAt: "2025-03-05T00:00:00Z",
    updatedAt: "2025-08-15T16:30:00Z",
  },
  {
    id: "6",
    email: "lisa.brown@example.com",
    firstName: "Lisa",
    lastName: "Brown",
    name: "Lisa Brown",
    role: "viewer",
    isActive: true,
    emailVerified: true,
    lastLoginAt: "2025-09-06T13:45:00Z",
    createdAt: "2025-03-12T00:00:00Z",
    updatedAt: "2025-09-06T13:45:00Z",
  },
  {
    id: "7",
    email: "david.kim@example.com",
    firstName: "David",
    lastName: "Kim",
    name: "David Kim",
    role: "viewer",
    isActive: true,
    emailVerified: true,
    lastLoginAt: "2025-09-08T08:15:00Z",
    createdAt: "2025-04-01T00:00:00Z",
    updatedAt: "2025-09-08T08:15:00Z",
  },
  {
    id: "8",
    email: "jennifer.davis@example.com",
    firstName: "Jennifer",
    lastName: "Davis",
    name: "Jennifer Davis",
    role: "viewer",
    isActive: true,
    emailVerified: false,
    lastLoginAt: null,
    createdAt: "2025-08-20T00:00:00Z",
    updatedAt: "2025-08-20T00:00:00Z",
  },
  {
    id: "9",
    email: "robert.wilson@example.com",
    firstName: "Robert",
    lastName: "Wilson",
    name: "Robert Wilson",
    role: "editor",
    isActive: true,
    emailVerified: true,
    lastLoginAt: "2025-09-05T17:30:00Z",
    createdAt: "2025-05-10T00:00:00Z",
    updatedAt: "2025-09-05T17:30:00Z",
  },
  {
    id: "10",
    email: "maria.garcia@example.com",
    firstName: "Maria",
    lastName: "Garcia",
    name: "Maria Garcia",
    role: "viewer",
    isActive: false,
    emailVerified: true,
    lastLoginAt: "2025-07-20T10:00:00Z",
    createdAt: "2025-06-01T00:00:00Z",
    updatedAt: "2025-07-20T10:00:00Z",
  },
  {
    id: "11",
    email: "james.taylor@example.com",
    firstName: "James",
    lastName: "Taylor",
    name: "James Taylor",
    role: "viewer",
    isActive: true,
    emailVerified: false,
    lastLoginAt: null,
    createdAt: "2025-09-01T00:00:00Z",
    updatedAt: "2025-09-01T00:00:00Z",
  },
  {
    id: "12",
    email: "anna.lee@example.com",
    firstName: "Anna",
    lastName: "Lee",
    name: "Anna Lee",
    role: "editor",
    isActive: true,
    emailVerified: true,
    lastLoginAt: "2025-09-07T12:45:00Z",
    createdAt: "2025-07-15T00:00:00Z",
    updatedAt: "2025-09-07T12:45:00Z",
  },
];

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  user: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  api_user: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  editor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  viewer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const roleDescriptions: Record<string, string> = {
  admin: "Full access to all features and settings",
  user: "Regular user access",
  api_user: "API access user for programmatic usage",
  editor: "Read and write access to content",
  viewer: "Read-only access to content",
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "user",
    isActive: true,
  });

  // Fetch users from API
  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        return await apiClient.users.list();
      } catch (error) {
        console.error('Failed to fetch users:', error);
        // Fallback to empty data if API fails
        return {
          data: [],
          meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 }
        };
      }
    },
  });

  const users = usersResponse?.data || [];

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete user");
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsEditPanelOpen(false);
      setSelectedUser(null);
      toast.success("User updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update user");
    },
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email,
      role: user.role,
      isActive: user.isActive ?? true,
    });
    setIsEditPanelOpen(true);
  };

  const handleSaveUser = () => {
    if (!selectedUser) return;
    
    updateMutation.mutate({
      id: selectedUser.id,
      data: {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        role: editForm.role,
        isActive: editForm.isActive,
      }
    });
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error("You cannot delete your own account");
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${user.name || user.email}?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (user.firstName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (user.lastName?.toLowerCase() || "").includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.isActive) ||
      (statusFilter === "inactive" && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-500 mt-1">
            Manage users, roles, and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Verified</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.emailVerified).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Admins</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === "admin").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="api_user">API User</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user.name || "Unnamed User"
                          }
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {user.emailVerified ? (
                            <Badge variant="secondary" className="text-xs">
                              <Mail className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Mail className="h-3 w-3 mr-1" />
                              Unverified
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role] || roleColors.user}>
                      {user.role === 'api_user' ? 'API User' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {roleDescriptions[user.role] || roleDescriptions.user}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.isActive ? (
                        <>
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <span className="text-green-600">Active</span>
                        </>
                      ) : (
                        <>
                          <UserX className="h-4 w-4 text-red-600" />
                          <span className="text-red-600">Inactive</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {formatDate(user.lastLoginAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.id === currentUser?.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No users found</p>
              <p className="text-sm text-gray-500">
                {searchQuery || roleFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by inviting your first user"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Panel */}
      <SlidingPanel
        isOpen={isEditPanelOpen}
        onClose={() => {
          setIsEditPanelOpen(false);
          setSelectedUser(null);
        }}
        title={`Edit ${selectedUser?.name || selectedUser?.email || "User"}`}
        description="Update user information and permissions"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditPanelOpen(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveUser}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                disabled
                className="bg-gray-50 dark:bg-gray-800"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select 
                value={editForm.role} 
                onValueChange={(value: string) => setEditForm({ ...editForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex flex-col items-start">
                      <span>Admin</span>
                      <span className="text-xs text-gray-500">{roleDescriptions.admin}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex flex-col items-start">
                      <span>User</span>
                      <span className="text-xs text-gray-500">{roleDescriptions.user}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="api_user">
                    <div className="flex flex-col items-start">
                      <span>API User</span>
                      <span className="text-xs text-gray-500">{roleDescriptions.api_user}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <input
                type="checkbox"
                id="isActive"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                className="rounded"
              />
              <div>
                <Label htmlFor="isActive" className="font-medium">
                  Active Account
                </Label>
                <p className="text-xs text-gray-500">
                  Inactive users cannot sign in or access the platform
                </p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Current Role: {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {roleDescriptions[selectedUser.role]}
              </p>
            </div>
          </div>
        )}
      </SlidingPanel>
    </div>
  );
}