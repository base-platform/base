"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface RateLimitConfig {
  id: string;
  name: string;
  description?: string;
  ttl: number;
  limit: number;
  endpoints: string[];
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export default function RateLimitsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<RateLimitConfig | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    ttl: 60000,
    limit: 100,
    endpoints: "",
    is_active: true,
    priority: 0,
  });

  // Fetch rate limit configs
  const { data: configs = [], isLoading, error } = useQuery({
    queryKey: ["rateLimits"],
    queryFn: async () => {
      const response = await apiClient.axios.get<RateLimitConfig[]>("/admin/rate-limits");
      return response.data;
    },
    retry: 1, // Limit retries to prevent infinite loops
    retryDelay: 1000,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingConfig) {
        const response = await apiClient.axios.put(`/admin/rate-limits/${editingConfig.name}`, data);
        return response.data;
      } else {
        const response = await apiClient.axios.post("/admin/rate-limits", data);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rateLimits"] });
      toast.success(editingConfig ? "Rate limit updated" : "Rate limit created");
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to save rate limit");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      await apiClient.axios.delete(`/admin/rate-limits/${name}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rateLimits"] });
      toast.success("Rate limit deleted");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete rate limit");
    },
  });

  // Reload mutation
  const reloadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.axios.post("/admin/rate-limits/reload");
      return response.data;
    },
    onSuccess: () => {
      toast.success("Rate limits reloaded successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reload rate limits");
    },
  });

  // Table columns
  const columns: ColumnDef<RateLimitConfig>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">
          {row.original.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "limit",
      header: "Rate Limit",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {row.original.limit} requests / {(row.original.ttl / 1000).toFixed(0)}s
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "endpoints",
      header: "Endpoints",
      cell: ({ row }) => {
        const endpoints = row.original.endpoints;
        if (!endpoints || endpoints.length === 0) {
          return <span className="text-sm text-gray-400">All endpoints</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {endpoints.slice(0, 2).map((endpoint, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {endpoint}
              </Badge>
            ))}
            {endpoints.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{endpoints.length - 2} more
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <Badge variant={row.original.priority > 5 ? "default" : "secondary"}>
          {row.original.priority}
        </Badge>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.is_active ? "success" : "secondary"}
          className={row.original.is_active ? "bg-green-100 text-green-800" : ""}
        >
          {row.original.is_active ? (
            <>
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3 mr-1" />
              Inactive
            </>
          )}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditDialog(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.original.name)}
            disabled={["default", "auth"].includes(row.original.name)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Table setup
  const table = useReactTable({
    data: configs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const openCreateDialog = () => {
    setEditingConfig(null);
    setFormData({
      name: "",
      description: "",
      ttl: 60000,
      limit: 100,
      endpoints: "",
      is_active: true,
      priority: 0,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (config: RateLimitConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      description: config.description || "",
      ttl: config.ttl,
      limit: config.limit,
      endpoints: config.endpoints.join("\n"),
      is_active: config.is_active,
      priority: config.priority,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingConfig(null);
  };

  const handleSave = () => {
    const data = {
      ...formData,
      endpoints: formData.endpoints
        .split("\n")
        .map(e => e.trim())
        .filter(e => e.length > 0),
    };
    saveMutation.mutate(data);
  };

  const handleDelete = (name: string) => {
    if (confirm(`Are you sure you want to delete the "${name}" rate limit?`)) {
      deleteMutation.mutate(name);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load rate limits</h3>
          <p className="text-gray-500 mb-4">
            {(error as any)?.response?.data?.message || "Unable to fetch rate limit configurations"}
          </p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["rateLimits"] })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Rate Limits</h1>
          <p className="text-gray-500">
            Configure API rate limiting rules to protect your endpoints
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => reloadMutation.mutate()}
            disabled={reloadMutation.isPending}
          >
            {reloadMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Reload All
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rate Limit
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rate Limit Configurations</CardTitle>
          <CardDescription>
            Manage rate limiting rules for different endpoints and scenarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No rate limits configured
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "Edit Rate Limit" : "Create Rate Limit"}
            </DialogTitle>
            <DialogDescription>
              Configure rate limiting rules for API endpoints
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., api, auth, public"
                disabled={!!editingConfig}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this rate limit"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="limit">Request Limit</Label>
                <Input
                  id="limit"
                  type="number"
                  value={formData.limit}
                  onChange={(e) => setFormData({ ...formData, limit: parseInt(e.target.value) })}
                  placeholder="100"
                />
              </div>
              <div>
                <Label htmlFor="ttl">Time Window (ms)</Label>
                <Input
                  id="ttl"
                  type="number"
                  value={formData.ttl}
                  onChange={(e) => setFormData({ ...formData, ttl: parseInt(e.target.value) })}
                  placeholder="60000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="endpoints">
                Endpoints (one per line, leave empty for all)
              </Label>
              <Textarea
                id="endpoints"
                value={formData.endpoints}
                onChange={(e) => setFormData({ ...formData, endpoints: e.target.value })}
                placeholder="/auth/login&#10;/auth/register&#10;/api/*"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority (higher = evaluated first)</Label>
              <Input
                id="priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                placeholder="0"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingConfig ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}