"use client";

import { useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Copy, Shield, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  permissions: string[];
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string | null;
}

const mockApiKeys: ApiKey[] = [
  {
    id: "1",
    name: "Production API",
    key: "sk_prod_****************************",
    status: "ACTIVE",
    permissions: ["read", "write"],
    createdAt: "2024-01-15",
    lastUsedAt: "2024-03-20",
    expiresAt: null,
  },
  {
    id: "2",
    name: "Development API",
    key: "sk_dev_****************************",
    status: "ACTIVE",
    permissions: ["read"],
    createdAt: "2024-02-01",
    lastUsedAt: "2024-03-19",
    expiresAt: "2024-12-31",
  },
  {
    id: "3",
    name: "Testing API",
    key: "sk_test_****************************",
    status: "REVOKED",
    permissions: ["read", "write", "delete"],
    createdAt: "2024-01-01",
    lastUsedAt: "2024-02-15",
    expiresAt: null,
  },
];

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState(mockApiKeys);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState({
    name: "",
    permissions: [] as string[],
    expiresIn: "never",
  });
  const [generatedKey, setGeneratedKey] = useState("");

  const handleCreateKey = () => {
    const key = `sk_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const apiKey: ApiKey = {
      id: Date.now().toString(),
      name: newKey.name,
      key: `sk_****************************`,
      status: "ACTIVE",
      permissions: newKey.permissions,
      createdAt: new Date().toISOString().split("T")[0],
      lastUsedAt: "-",
      expiresAt: newKey.expiresIn === "never" ? null : 
        new Date(Date.now() + parseInt(newKey.expiresIn) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    };
    
    setApiKeys([...apiKeys, apiKey]);
    setGeneratedKey(key);
  };

  const handleRevoke = (id: string) => {
    setApiKeys(apiKeys.map(key => 
      key.id === id ? { ...key, status: "REVOKED" as const } : key
    ));
  };

  const handleDelete = (id: string) => {
    setApiKeys(apiKeys.filter(key => key.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Manage API keys for authentication
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for your application
              </DialogDescription>
            </DialogHeader>
            {!generatedKey ? (
              <>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      placeholder="Production API"
                      value={newKey.name}
                      onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="permissions">Permissions</Label>
                    <div className="flex gap-2 mt-2">
                      {["read", "write", "delete"].map((perm) => (
                        <Button
                          key={perm}
                          variant={newKey.permissions.includes(perm) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            if (newKey.permissions.includes(perm)) {
                              setNewKey({
                                ...newKey,
                                permissions: newKey.permissions.filter(p => p !== perm),
                              });
                            } else {
                              setNewKey({
                                ...newKey,
                                permissions: [...newKey.permissions, perm],
                              });
                            }
                          }}
                        >
                          {perm}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="expires">Expires In</Label>
                    <Select value={newKey.expiresIn} onValueChange={(value) => setNewKey({ ...newKey, expiresIn: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateKey}>Create Key</Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                      Save this API key securely. You won't be able to see it again!
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 p-2 bg-white dark:bg-gray-900 rounded text-sm">
                        {generatedKey}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(generatedKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => {
                    setIsCreateOpen(false);
                    setGeneratedKey("");
                    setNewKey({ name: "", permissions: [], expiresIn: "never" });
                  }}>
                    Done
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active API Keys</CardTitle>
          <CardDescription>Manage your API keys and their permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <code className="text-sm">{key.key}</code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        key.status === "ACTIVE" ? "default" :
                        key.status === "REVOKED" ? "destructive" :
                        "secondary"
                      }
                    >
                      {key.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {key.permissions.map((perm) => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{key.lastUsedAt}</TableCell>
                  <TableCell>{key.expiresAt || "Never"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(key.key)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Key
                        </DropdownMenuItem>
                        {key.status === "ACTIVE" && (
                          <DropdownMenuItem onClick={() => handleRevoke(key.id)}>
                            <Shield className="h-4 w-4 mr-2" />
                            Revoke
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(key.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}