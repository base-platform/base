"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  UserPlus, 
  Mail,
  User,
  Shield,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Send,
  Users,
  Crown,
  Briefcase,
  Eye
} from "lucide-react";
import { apiClient, UserRole } from "@/lib/api-client";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["admin", "editor", "viewer"], {
    required_error: "Please select a role",
  }),
  customMessage: z.string().optional(),
});

type InviteForm = z.infer<typeof inviteSchema>;

const roleDetails = {
  admin: {
    name: "Administrator",
    description: "Full system access with all permissions",
    icon: Crown,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    permissions: ["User Management", "Entity Management", "API Management", "System Administration"]
  },
  editor: {
    name: "Editor", 
    description: "Content creation and management permissions",
    icon: Briefcase,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    permissions: ["Entity Management", "View Analytics", "Export Data"]
  },
  viewer: {
    name: "Viewer",
    description: "Read-only access to system resources", 
    icon: Eye,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    permissions: ["View Entities", "View API Keys", "View Analytics"]
  }
};

export default function InviteUserPage() {
  const { canManageUsers, isAdmin } = usePermissions();
  const [inviteStep, setInviteStep] = useState<"form" | "success">("form");
  const [invitedUser, setInvitedUser] = useState<any>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: "viewer",
    },
  });

  const selectedRole = watch("role");

  // Mock invite mutation - in real implementation would use apiClient.users.invite
  const inviteMutation = useMutation({
    mutationFn: async (data: InviteForm) => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock response
      return {
        message: "Invitation sent successfully",
        inviteId: `invite_${Math.random().toString(36).substr(2, 9)}`,
        user: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
        }
      };
    },
    onSuccess: (response) => {
      setInvitedUser(response.user);
      setInviteStep("success");
      toast.success("User invitation sent successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send invitation");
    },
  });

  const onSubmit = (data: InviteForm) => {
    inviteMutation.mutate(data);
  };

  const handleSendAnother = () => {
    setInviteStep("form");
    setInvitedUser(null);
    reset();
  };

  if (!canManageUsers()) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500">
            You don't have permission to invite users
          </p>
        </div>
      </div>
    );
  }

  if (inviteStep === "success") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Button */}
        <div className="flex items-center gap-4">
          <Link href="/users">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </Link>
        </div>

        {/* Success Card */}
        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            
            <h2 className="text-xl font-semibold mb-2">Invitation Sent!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We've sent an invitation email to <strong>{invitedUser?.email}</strong>
            </p>

            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium">
                    {invitedUser?.firstName} {invitedUser?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{invitedUser?.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                      {invitedUser?.role.charAt(0).toUpperCase() + invitedUser?.role.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleSendAnother} variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Another User
              </Button>
              <Link href="/users">
                <Button>
                  <Users className="h-4 w-4 mr-2" />
                  View All Users
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What happens next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full text-xs font-medium text-blue-600 dark:text-blue-400">
                1
              </div>
              <div>
                <p className="font-medium">Email Delivered</p>
                <p className="text-sm text-gray-500">
                  The user will receive an invitation email with setup instructions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full text-xs font-medium text-blue-600 dark:text-blue-400">
                2
              </div>
              <div>
                <p className="font-medium">Account Setup</p>
                <p className="text-sm text-gray-500">
                  They'll create their password and complete their profile
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full text-xs font-medium text-blue-600 dark:text-blue-400">
                3
              </div>
              <div>
                <p className="font-medium">Access Granted</p>
                <p className="text-sm text-gray-500">
                  The user will appear in your user list and can start using the platform
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Invite User</h1>
          <p className="text-gray-500 mt-1">
            Send an invitation to join your team
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
            <CardDescription>
              Enter the details for the new user
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  className="pl-9"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  {...register("lastName")}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Assignment
            </CardTitle>
            <CardDescription>
              Choose the appropriate role for this user
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(value: UserRole) => setValue("role", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(roleDetails) as UserRole[]).map((role) => {
                    const details = roleDetails[role];
                    const Icon = details.icon;
                    
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${details.color}`} />
                          <div className="text-left">
                            <div className="font-medium">{details.name}</div>
                            <div className="text-xs text-gray-500">{details.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-600 mt-1">{errors.role.message}</p>
              )}
            </div>

            {/* Role Preview */}
            {selectedRole && (
              <div className={`p-4 rounded-lg ${roleDetails[selectedRole].bgColor}`}>
                <div className="flex items-center gap-3 mb-3">
                  {(() => {
                    const Icon = roleDetails[selectedRole].icon;
                    return <Icon className={`h-5 w-5 ${roleDetails[selectedRole].color}`} />;
                  })()}
                  <div>
                    <h4 className="font-medium">{roleDetails[selectedRole].name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {roleDetails[selectedRole].description}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">This role includes:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {roleDetails[selectedRole].permissions.map((permission, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span>{permission}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Optional Custom Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Custom Message (Optional)
            </CardTitle>
            <CardDescription>
              Add a personal message to the invitation email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Hi! I'm inviting you to join our team. Looking forward to working with you!"
              className="min-h-20"
              {...register("customMessage")}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/users">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={inviteMutation.isPending}
          >
            {inviteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending Invitation...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}