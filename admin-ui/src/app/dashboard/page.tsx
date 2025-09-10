"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Database, FunctionSquare, Key, Users, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export default function DashboardPage() {
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.dashboard.getStats(),
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Welcome to your API Platform dashboard
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Welcome to your API Platform dashboard
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400">
                Failed to load dashboard data. Please try again later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Entities",
      value: dashboardData?.stats.totalEntities.value.toString() || "0",
      description: "Active entity schemas",
      icon: Database,
      change: dashboardData?.stats.totalEntities.change || "No data",
    },
    {
      title: "API Keys",
      value: dashboardData?.stats.totalApiKeys.value.toString() || "0",
      description: "Active API keys",
      icon: Key,
      change: dashboardData?.stats.totalApiKeys.change || "No data",
    },
    {
      title: "Functions",
      value: dashboardData?.stats.totalFunctions.value.toString() || "0",
      description: "Deployed functions",
      icon: FunctionSquare,
      change: dashboardData?.stats.totalFunctions.change || "No data",
    },
    {
      title: "Total Users",
      value: dashboardData?.stats.totalUsers.value.toString() || "0",
      description: "Registered users",
      icon: Users,
      change: dashboardData?.stats.totalUsers.change || "No data",
    },
  ];
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Welcome to your API Platform dashboard
        </p>
      </div>


      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData?.recentActivity.length ? (
                dashboardData.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <Activity className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.entity}</p>
                    </div>
                    <span className="text-xs text-gray-400">{activity.time}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Usage</CardTitle>
            <CardDescription>Requests over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[200px] text-gray-400">
              <BarChart3 className="h-12 w-12" />
              <span className="ml-4">Chart visualization here</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}