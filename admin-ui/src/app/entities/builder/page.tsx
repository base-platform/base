"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-tomorrow.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EntityRecordsTable } from "@/components/entities/entity-records-table";
import { 
  Plus, 
  Database, 
  Trash2, 
  X, 
  Loader2, 
  Search,
  GripVertical,
  FileJson,
  Table2,
  Code,
  Eye,
  Copy,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Info
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { validateDataAgainstSchema, validateJsonSchema, formatValidationErrors } from "@/lib/schema-validator";
import { Switch } from "@/components/ui/switch";
import { SlidingPanel } from "@/components/ui/sliding-panel";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Entity {
  id: string;
  name: string;
  display_name: string;
  description: string;
  schema: any;
  version: number;
  is_active: boolean;
  idempotency_enabled?: boolean;
  idempotency_ttl?: number;
  idempotency_methods?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  _count?: {
    entity_records: number;
  };
}

interface EntityTab {
  entityId: string;
  entity: Entity;
}

interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  enum?: string[];
  description?: string;
}

const defaultSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      minLength: 1,
      maxLength: 100,
    },
  },
  required: ["name"],
};

// Utility function to extract schema properties
function extractSchemaProperties(schema: any): SchemaField[] {
  const properties = schema?.properties || {};
  const required = schema?.required || [];
  
  return Object.entries(properties).map(([key, prop]: [string, any]) => ({
    name: key,
    type: prop.type === 'array' ? `${prop.type}[${prop.items?.type || 'any'}]` : prop.type,
    required: required.includes(key),
    format: prop.format,
    minimum: prop.minimum,
    maximum: prop.maximum,
    minLength: prop.minLength,
    maxLength: prop.maxLength,
    enum: prop.enum,
    description: prop.description,
  }));
}

// Format constraints for display
function formatConstraints(field: SchemaField): string {
  const constraints: string[] = [];
  
  if (field.enum) {
    constraints.push(`enum: ${field.enum.join(', ')}`);
  }
  if (field.format) {
    constraints.push(`format: ${field.format}`);
  }
  if (field.minLength !== undefined) {
    constraints.push(`minLength: ${field.minLength}`);
  }
  if (field.maxLength !== undefined) {
    constraints.push(`maxLength: ${field.maxLength}`);
  }
  if (field.minimum !== undefined) {
    constraints.push(`minimum: ${field.minimum}`);
  }
  if (field.maximum !== undefined) {
    constraints.push(`maximum: ${field.maximum}`);
  }
  
  return constraints.length > 0 ? constraints.join(', ') : '';
}

// Schema Fields Table Component
function SchemaFieldsTable({ schema }: { schema: any }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const data = useMemo(() => extractSchemaProperties(schema), [schema]);

  const columns = useMemo<ColumnDef<SchemaField>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Field Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className={`font-medium ${row.original.required ? 'text-blue-600 dark:text-blue-400' : ''}`}>
            {row.original.name}
          </span>
          {row.original.required && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded">
              required
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => (
        <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          {getValue<string>()}
        </code>
      ),
    },
    {
      id: 'constraints',
      header: 'Constraints',
      cell: ({ row }) => {
        const constraints = formatConstraints(row.original);
        return constraints ? (
          <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
            {constraints}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        );
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ getValue }) => {
        const description = getValue<string>();
        return description ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        );
      },
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div className="space-y-4">
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
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No fields defined in schema.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function EntityBuilderPage() {
  const queryClient = useQueryClient();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [showSchemaCode, setShowSchemaCode] = useState(false);
  const [openTabs, setOpenTabs] = useState<EntityTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [schemaMode, setSchemaMode] = useState<"ui" | "table" | "code">("ui");
  const [newEntity, setNewEntity] = useState({
    name: "",
    displayName: "",
    description: "",
    schema: JSON.stringify(defaultSchema, null, 2),
    isActive: true,
    idempotencyEnabled: false,
    idempotencyTtl: 86400000, // 24 hours in milliseconds
    idempotencyMethods: ["POST", "PUT"],
  });

  // Helper function to convert display name to kebab case
  const toKebabCase = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/--+/g, '-');
  };
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([
    { name: "name", type: "string", required: true, minLength: 1, maxLength: 100 }
  ]);
  const [codeError, setCodeError] = useState<string>("");

  const resizeRef = useRef<HTMLDivElement>(null);

  // Fetch entities
  const { data: entitiesResponse, isLoading } = useQuery({
    queryKey: ["entities"],
    queryFn: () => apiClient.entities.list(),
  });
  
  const entities = entitiesResponse || [];

  // Records state
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPageSize, setRecordsPageSize] = useState(10);
  const [showCreateRecord, setShowCreateRecord] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [newRecordData, setNewRecordData] = useState("{}");
  const [recordValidationError, setRecordValidationError] = useState<string>("");

  // Fetch entity records
  const { data: entityRecords, isLoading: isLoadingRecords, error: recordsError } = useQuery({
    queryKey: ["entityRecords", activeTabId, recordsPage, recordsPageSize],
    queryFn: () => {
      const tab = openTabs.find(t => t.entityId === activeTabId);
      if (!tab) return null;
      return apiClient.entities.records(tab.entityId).list({
        page: recordsPage,
        pageSize: recordsPageSize,
      });
    },
    enabled: !!activeTabId,
    retry: 1,
  });

  // Create entity mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.entities.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      resetForm();
      toast.success("Entity created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create entity");
    },
  });

  // Update entity mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.entities.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      resetForm();
      toast.success("Entity updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update entity");
    },
  });

  // Delete entity mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.entities.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      // Close tab if open
      setOpenTabs(prev => prev.filter(tab => tab.entityId !== deletedId));
      if (activeTabId === deletedId) {
        setActiveTabId(openTabs[0]?.entityId || null);
      }
      toast.success("Entity deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete entity");
    },
  });

  // Create record mutation
  const createRecordMutation = useMutation({
    mutationFn: ({ entityId, data }: { entityId: string; data: any }) => 
      apiClient.entities.records(entityId).create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entityRecords", activeTabId] });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      setShowCreateRecord(false);
      setNewRecordData("{}");
      toast.success("Record created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create record");
    },
  });

  // Update record mutation
  const updateRecordMutation = useMutation({
    mutationFn: ({ entityId, recordId, data }: { entityId: string; recordId: string; data: any }) => 
      apiClient.entities.records(entityId).update(recordId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entityRecords", activeTabId] });
      setSelectedRecord(null);
      toast.success("Record updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update record");
    },
  });

  // Delete record mutation
  const deleteRecordMutation = useMutation({
    mutationFn: ({ entityId, recordId }: { entityId: string; recordId: string }) => 
      apiClient.entities.records(entityId).delete(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entityRecords", activeTabId] });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      toast.success("Record deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete record");
    },
  });

  // Handle entity selection
  const handleEntitySelect = (entity: Entity) => {
    const existingTab = openTabs.find(tab => tab.entityId === entity.id);
    
    if (!existingTab) {
      setOpenTabs(prev => [...prev, { entityId: entity.id, entity }]);
    }
    setActiveTabId(entity.id);
  };

  // Close tab
  const handleCloseTab = (entityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs(prev => prev.filter(tab => tab.entityId !== entityId));
    
    if (activeTabId === entityId) {
      const remainingTabs = openTabs.filter(tab => tab.entityId !== entityId);
      setActiveTabId(remainingTabs[remainingTabs.length - 1]?.entityId || null);
    }
  };

  // Handle resize
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = Math.min(Math.max(200, e.clientX), 500);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Convert UI fields to JSON Schema
  const fieldsToSchema = () => {
    const properties: any = {};
    const required: string[] = [];

    schemaFields.forEach(field => {
      const prop: any = { type: field.type };
      
      if (field.format) prop.format = field.format;
      if (field.description) prop.description = field.description;
      if (field.minimum !== undefined) prop.minimum = field.minimum;
      if (field.maximum !== undefined) prop.maximum = field.maximum;
      if (field.minLength !== undefined) prop.minLength = field.minLength;
      if (field.maxLength !== undefined) prop.maxLength = field.maxLength;
      if (field.enum && field.enum.length > 0) prop.enum = field.enum;
      
      properties[field.name] = prop;
      if (field.required) required.push(field.name);
    });

    return {
      type: "object",
      properties,
      required,
    };
  };

  // Convert JSON Schema to UI fields
  const schemaToFields = (schemaString: string): SchemaField[] => {
    try {
      const schema = JSON.parse(schemaString);
      if (!schema.properties) return [];
      
      const fields: SchemaField[] = [];
      const required = schema.required || [];
      
      Object.entries(schema.properties).forEach(([name, prop]: [string, any]) => {
        const field: SchemaField = {
          name,
          type: prop.type || 'string',
          required: required.includes(name),
        };
        
        if (prop.format) field.format = prop.format;
        if (prop.description) field.description = prop.description;
        if (prop.minimum !== undefined) field.minimum = prop.minimum;
        if (prop.maximum !== undefined) field.maximum = prop.maximum;
        if (prop.minLength !== undefined) field.minLength = prop.minLength;
        if (prop.maxLength !== undefined) field.maxLength = prop.maxLength;
        if (prop.enum) field.enum = prop.enum;
        
        fields.push(field);
      });
      
      return fields;
    } catch (error) {
      return schemaFields; // Return current fields if parsing fails
    }
  };

  // Update schema in Code tab when Visual fields change
  useEffect(() => {
    if (schemaMode === 'ui') {
      const schema = fieldsToSchema();
      setNewEntity(prev => ({
        ...prev,
        schema: JSON.stringify(schema, null, 2)
      }));
    }
  }, [schemaFields, schemaMode]);

  // Update Visual fields when switching from Code to Visual
  useEffect(() => {
    if (schemaMode === 'ui' && newEntity.schema) {
      // Only update if switching TO ui mode
      const fields = schemaToFields(newEntity.schema);
      if (fields.length > 0) {
        setSchemaFields(fields);
      }
    }
  }, [schemaMode]);

  // Handle entity creation/update
  const handleSaveEntity = () => {
    try {
      let schema;
      if (schemaMode === "ui") {
        schema = fieldsToSchema();
      } else {
        // Validate JSON schema first
        const schemaValidation = validateJsonSchema(newEntity.schema);
        if (!schemaValidation.valid) {
          toast.error(
            <div>
              <p className="font-semibold mb-2">Invalid Schema</p>
              <pre className="text-xs whitespace-pre-wrap">{formatValidationErrors(schemaValidation.errors)}</pre>
            </div>
          );
          return;
        }
        schema = JSON.parse(newEntity.schema);
      }

      const entityData = {
        ...newEntity,
        schema,
      };

      if (isEditMode && selectedEntity) {
        updateMutation.mutate({ id: selectedEntity.id, data: entityData });
      } else {
        createMutation.mutate(entityData);
      }
    } catch (error) {
      toast.error("Invalid JSON schema");
    }
  };

  // Reset form
  const resetForm = () => {
    setIsPanelOpen(false);
    setIsEditMode(false);
    setSelectedEntity(null);
    setShowSchemaCode(false);
    setNewEntity({
      name: "",
      displayName: "",
      description: "",
      schema: JSON.stringify(defaultSchema, null, 2),
      isActive: true,
    });
    setSchemaFields([
      { name: "name", type: "string", required: true, minLength: 1, maxLength: 100 }
    ]);
  };

  // Handle record creation
  const handleCreateRecord = () => {
    if (!activeTabId) return;
    
    try {
      const data = JSON.parse(newRecordData);
      
      // Validate against schema
      const tab = openTabs.find(t => t.entityId === activeTabId);
      if (tab && tab.entity.schema) {
        const validation = validateDataAgainstSchema(data, tab.entity.schema);
        if (!validation.valid) {
          toast.error(
            <div>
              <p className="font-semibold mb-2">Validation Failed</p>
              <pre className="text-xs whitespace-pre-wrap">{formatValidationErrors(validation.errors)}</pre>
            </div>
          );
          return;
        }
      }
      
      createRecordMutation.mutate({ entityId: activeTabId, data });
    } catch (error) {
      toast.error("Invalid JSON data");
    }
  };

  // Handle record update
  const handleUpdateRecord = (record: any, newData: string) => {
    if (!activeTabId) return;
    
    try {
      const data = JSON.parse(newData);
      
      // Validate against schema
      const tab = openTabs.find(t => t.entityId === activeTabId);
      if (tab && tab.entity.schema) {
        const validation = validateDataAgainstSchema(data, tab.entity.schema);
        if (!validation.valid) {
          toast.error(
            <div>
              <p className="font-semibold mb-2">Validation Failed</p>
              <pre className="text-xs whitespace-pre-wrap">{formatValidationErrors(validation.errors)}</pre>
            </div>
          );
          return;
        }
      }
      
      updateRecordMutation.mutate({ 
        entityId: activeTabId, 
        recordId: record.id, 
        data 
      });
    } catch (error) {
      toast.error("Invalid JSON data");
    }
  };

  // Handle record deletion
  const handleDeleteRecord = (record: any) => {
    if (!activeTabId) return;
    
    if (window.confirm('Are you sure you want to delete this record?')) {
      deleteRecordMutation.mutate({ 
        entityId: activeTabId, 
        recordId: record.id 
      });
    }
  };

  // Reset records pagination when changing tabs
  useEffect(() => {
    setRecordsPage(1);
  }, [activeTabId]);

  // Open edit panel
  const handleEditEntity = (entity: Entity) => {
    setSelectedEntity(entity);
    setIsEditMode(true);
    setNewEntity({
      name: entity.name,
      displayName: entity.display_name,
      description: entity.description || "",
      schema: JSON.stringify(entity.schema, null, 2),
      isActive: entity.is_active,
    });
    
    // Parse schema to fields for UI mode
    if (entity.schema && entity.schema.properties) {
      const fields: SchemaField[] = [];
      const required = entity.schema.required || [];
      
      Object.entries(entity.schema.properties).forEach(([name, prop]: [string, any]) => {
        fields.push({
          name,
          type: prop.type,
          required: required.includes(name),
          format: prop.format,
          minimum: prop.minimum,
          maximum: prop.maximum,
          minLength: prop.minLength,
          maxLength: prop.maxLength,
          enum: prop.enum,
          description: prop.description,
        });
      });
      
      setSchemaFields(fields);
    }
    
    setIsPanelOpen(true);
  };

  // Add field
  const addField = () => {
    setSchemaFields(prev => {
      const newFields = [...prev, {
        name: `field_${prev.length + 1}`,
        type: "string",
        required: false,
      }];
      
      // Update Code tab immediately when in Visual or Table mode
      if (schemaMode === 'ui' || schemaMode === 'table') {
        updateSchemaFromFields(newFields);
      }
      
      return newFields;
    });
  };

  // Remove field
  const removeField = (index: number) => {
    setSchemaFields(prev => {
      const newFields = prev.filter((_, i) => i !== index);
      
      // Update Code tab immediately when in Visual or Table mode
      if (schemaMode === 'ui' || schemaMode === 'table') {
        updateSchemaFromFields(newFields);
      }
      
      return newFields;
    });
  };

  // Update field
  const updateField = (index: number, updates: Partial<SchemaField>) => {
    setSchemaFields(prev => {
      const newFields = prev.map((field, i) => 
        i === index ? { ...field, ...updates } : field
      );
      
      // Update Code tab immediately when in Visual or Table mode
      if (schemaMode === 'ui' || schemaMode === 'table') {
        updateSchemaFromFields(newFields);
      }
      
      return newFields;
    });
  };

  // Helper to update schema from fields
  const updateSchemaFromFields = (fields: SchemaField[]) => {
    const properties: any = {};
    const required: string[] = [];
    
    fields.forEach(field => {
      const prop: any = { type: field.type };
      if (field.format) prop.format = field.format;
      if (field.description) prop.description = field.description;
      if (field.minimum !== undefined) prop.minimum = field.minimum;
      if (field.maximum !== undefined) prop.maximum = field.maximum;
      if (field.minLength !== undefined) prop.minLength = field.minLength;
      if (field.maxLength !== undefined) prop.maxLength = field.maxLength;
      if (field.enum && field.enum.length > 0) prop.enum = field.enum;
      properties[field.name] = prop;
      if (field.required) required.push(field.name);
    });
    
    setNewEntity(prev => ({
      ...prev,
      schema: JSON.stringify({ type: "object", properties, required }, null, 2)
    }));
  };

  // Filtered entities
  const filteredEntities = entities.filter((entity: Entity) =>
    entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entity.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTab = openTabs.find(tab => tab.entityId === activeTabId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Sidebar - Entity List */}
      <div 
        className="border-r border-gray-200 dark:border-gray-800 flex"
        style={{ width: sidebarWidth }}
      >
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <Button 
              className="w-full" 
              onClick={() => setIsPanelOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Entity
            </Button>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Search entities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Entity List */}
          <div className="flex-1 overflow-y-auto">
            {filteredEntities.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchQuery ? "No entities found" : "No entities yet"}
              </div>
            ) : (
              <div className="px-3 py-2 space-y-2">
                {filteredEntities.map((entity: Entity) => (
                  <div
                    key={entity.id}
                    onClick={() => handleEntitySelect(entity)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-colors group hover:bg-gray-100 dark:hover:bg-gray-800",
                      activeTabId === entity.id && "bg-gray-100 dark:bg-gray-800"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Database className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <p className="font-medium text-sm truncate">
                            {entity.display_name}
                          </p>
                          <Badge 
                            variant="outline"
                            className="ml-auto text-xs font-normal"
                          >
                            {entity._count?.entity_records || 0}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={entity.is_active ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {entity.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {entity.idempotency_enabled && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge 
                                    variant="outline"
                                    className="text-xs cursor-help"
                                  >
                                    <Shield className="h-3 w-3 mr-1" />
                                    Idempotent
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-2">
                                  <p className="text-xs font-medium mb-1">Idempotency Enabled</p>
                                  <p className="text-xs text-gray-300">
                                    TTL: {entity.idempotency_ttl ? `${entity.idempotency_ttl / 1000 / 60} minutes` : '24 hours'}
                                    <br />
                                    Methods: {entity.idempotency_methods?.join(', ') || 'POST, PUT'}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Duplicate requests with the same Idempotency-Key will return cached responses.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleEditEntity(entity);
                          }}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(entity.id);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resize Handle */}
        <div
          ref={resizeRef}
          className="w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
          onMouseDown={handleMouseDown}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {openTabs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileJson className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No entity selected</p>
              <p className="text-sm text-gray-500">
                Select an entity from the left sidebar or create a new one
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs Header */}
            <div className="border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center overflow-x-auto">
                {openTabs.map((tab) => (
                  <div
                    key={tab.entityId}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 border-r border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900",
                      activeTabId === tab.entityId && "bg-white dark:bg-gray-950 border-b-2 border-b-blue-500"
                    )}
                    onClick={() => setActiveTabId(tab.entityId)}
                  >
                    <Database className="h-4 w-4" />
                    <span className="text-sm font-medium">{tab.entity.display_name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={(e) => handleCloseTab(tab.entityId, e)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab && (
              <div className="flex-1 overflow-hidden">
                <Tabs defaultValue="fields" className="h-full flex flex-col">
                  <TabsList className="w-full justify-start rounded-none border-b">
                    <TabsTrigger value="fields" className="flex items-center gap-2">
                      <FileJson className="h-4 w-4" />
                      Fields
                    </TabsTrigger>
                    <TabsTrigger value="data" className="flex items-center gap-2">
                      <Table2 className="h-4 w-4" />
                      Data
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="fields" className="flex-1 overflow-auto p-6 mt-0">
                    <div className="max-w-6xl">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold">{activeTab.entity.display_name}</h2>
                        <p className="text-gray-500 mt-1">{activeTab.entity.description}</p>
                        <div className="flex items-center gap-4 mt-4">
                          <Badge variant={activeTab.entity.is_active ? "default" : "secondary"}>
                            {activeTab.entity.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            /api/v1/{activeTab.entity.name}
                          </code>
                        </div>
                      </div>

                      {/* Schema Properties Table */}
                      <Card className="mb-6">
                        <CardHeader>
                          <CardTitle>Schema Fields</CardTitle>
                          <CardDescription>
                            Fields defined in this entity's JSON schema
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <SchemaFieldsTable schema={activeTab.entity.schema} />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Schema Definition</CardTitle>
                          <CardDescription>
                            JSON Schema that defines the structure and validation rules
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-lg overflow-hidden">
                            <SyntaxHighlighter 
                              language="json" 
                              style={vscDarkPlus}
                              customStyle={{
                                margin: 0,
                                padding: '1rem',
                                fontSize: '0.875rem',
                                lineHeight: '1.5',
                              }}
                              showLineNumbers={false}
                            >
                              {JSON.stringify(activeTab.entity.schema, null, 2)}
                            </SyntaxHighlighter>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="mt-6">
                        <CardHeader>
                          <CardTitle>API Endpoints</CardTitle>
                          <CardDescription>
                            Available REST API endpoints for this entity
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {[
                            { method: "GET", path: `/api/v1/${activeTab.entity.name}`, desc: "List all records" },
                            { method: "GET", path: `/api/v1/${activeTab.entity.name}/:id`, desc: "Get single record" },
                            { method: "POST", path: `/api/v1/${activeTab.entity.name}`, desc: "Create record" },
                            { method: "PUT", path: `/api/v1/${activeTab.entity.name}/:id`, desc: "Update record" },
                            { method: "DELETE", path: `/api/v1/${activeTab.entity.name}/:id`, desc: "Delete record" },
                            { method: "POST", path: `/api/v1/${activeTab.entity.name}/bulk`, desc: "Bulk create records" },
                            { method: "POST", path: `/api/v1/${activeTab.entity.name}/validate`, desc: "Validate data" },
                          ].map((endpoint, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded">
                              <div className="flex items-center gap-3">
                                <Badge className={cn(
                                  endpoint.method === "GET" && "bg-green-500",
                                  endpoint.method === "POST" && "bg-blue-500",
                                  endpoint.method === "PUT" && "bg-yellow-500",
                                  endpoint.method === "DELETE" && "bg-red-500"
                                )}>
                                  {endpoint.method}
                                </Badge>
                                <code className="text-sm">{endpoint.path}</code>
                                <span className="text-xs text-gray-500">{endpoint.desc}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Copy endpoint URL"
                                onClick={() => {
                                  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1").replace('/api/v1', '');
                                  const fullUrl = `${baseUrl}${endpoint.path}`;
                                  navigator.clipboard.writeText(fullUrl);
                                  toast.success(`Copied: ${fullUrl}`);
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="data" className="flex-1 overflow-auto p-6 mt-0">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-semibold">Entity Records</h3>
                          <p className="text-sm text-gray-500">
                            Manage data records for {activeTab.entity.display_name}
                          </p>
                        </div>
                        <Button onClick={() => setShowCreateRecord(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Record
                        </Button>
                      </div>

                      {isLoadingRecords ? (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                            <p className="text-sm text-gray-500 mt-2">Loading records...</p>
                          </CardContent>
                        </Card>
                      ) : recordsError ? (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                            <p className="text-lg font-medium mb-2 text-red-600">Error Loading Records</p>
                            <p className="text-sm text-gray-500 mb-4">
                              {recordsError?.response?.data?.message || "Failed to load entity records"}
                            </p>
                            <Button 
                              variant="outline" 
                              onClick={() => queryClient.invalidateQueries({ queryKey: ["entityRecords", activeTabId] })}
                            >
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Retry
                            </Button>
                          </CardContent>
                        </Card>
                      ) : entityRecords?.data?.length > 0 ? (
                        <EntityRecordsTable
                          records={entityRecords.data}
                          totalRecords={entityRecords.meta?.total || 0}
                          currentPage={recordsPage}
                          pageSize={recordsPageSize}
                          totalPages={entityRecords.meta?.totalPages || 1}
                          onPageChange={setRecordsPage}
                          onPageSizeChange={(size) => {
                            setRecordsPageSize(size);
                            setRecordsPage(1);
                          }}
                          onViewRecord={setSelectedRecord}
                          onDeleteRecord={handleDeleteRecord}
                          isLoading={isLoadingRecords}
                        />
                      ) : (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-lg font-medium mb-2">No records yet</p>
                            <p className="text-sm text-gray-500 mb-4">
                              Create your first record for this entity
                            </p>
                            <Button onClick={() => setShowCreateRecord(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add First Record
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sliding Panel for Create/Edit Entity */}
      <SlidingPanel
        isOpen={isPanelOpen}
        onClose={resetForm}
        title={isEditMode ? `Edit ${selectedEntity?.display_name || 'Entity'}` : "Create New Entity"}
        description={isEditMode ? "Update entity configuration and schema" : "Define a new entity with JSON Schema validation"}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEntity}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditMode ? "Update Entity" : "Create Entity"}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="User Profile"
                value={newEntity.displayName}
                onChange={(e) => {
                  const displayName = e.target.value;
                  setNewEntity({ 
                    ...newEntity, 
                    displayName,
                    // Auto-generate entity name in kebab-case if not in edit mode or if name is empty
                    name: (!isEditMode || !newEntity.name) ? toKebabCase(displayName) : newEntity.name
                  });
                }}
              />
            </div>

            <div>
              <Label htmlFor="name">Entity Name (kebab-case)</Label>
              <Input
                id="name"
                placeholder="user-profile"
                value={newEntity.name}
                onChange={(e) => setNewEntity({ 
                  ...newEntity, 
                  name: toKebabCase(e.target.value)
                })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Used in API: /api/v1/{newEntity.name || "entity-name"}
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Store user profile information"
                value={newEntity.description}
                onChange={(e) => setNewEntity({ ...newEntity, description: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={newEntity.isActive}
                onCheckedChange={(checked) => setNewEntity({ ...newEntity, isActive: checked })}
              />
              <Label htmlFor="isActive">Active (Enable API endpoints immediately)</Label>
            </div>
          </div>

          {/* Idempotency Configuration */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">Idempotency Settings</h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs p-3">
                        <p className="text-xs font-medium mb-2">What is Idempotency?</p>
                        <p className="text-xs text-gray-300">
                          Idempotency ensures that multiple identical requests have the same effect as a single request.
                          This prevents duplicate records, double charges, and data corruption from network retries.
                        </p>
                        <p className="text-xs font-medium mt-2 mb-1">Use cases:</p>
                        <ul className="text-xs text-gray-300 space-y-1">
                          <li>• Payment processing</li>
                          <li>• Order creation</li>
                          <li>• User registration</li>
                          <li>• Any critical operation</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Prevent duplicate operations when clients retry requests
                </p>
              </div>
              <Switch
                id="idempotencyEnabled"
                checked={newEntity.idempotencyEnabled}
                onCheckedChange={(checked) => setNewEntity({ ...newEntity, idempotencyEnabled: checked })}
              />
            </div>

            {newEntity.idempotencyEnabled && (
              <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="idempotencyTtl">TTL (Time to Live)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs p-3">
                          <p className="text-xs font-medium mb-2">Response Cache Duration</p>
                          <p className="text-xs text-gray-300 mb-2">
                            How long the server remembers and returns the same response for duplicate requests.
                          </p>
                          <p className="text-xs font-medium mb-1">Recommendations:</p>
                          <ul className="text-xs text-gray-300 space-y-1">
                            <li><strong>1-5 min:</strong> Token refresh, temp operations</li>
                            <li><strong>1 hour:</strong> Standard API calls</li>
                            <li><strong>24 hours:</strong> User registration, orders</li>
                            <li><strong>7 days:</strong> Critical long-running operations</li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={String(newEntity.idempotencyTtl)}
                    onValueChange={(value) => setNewEntity({ ...newEntity, idempotencyTtl: parseInt(value) })}
                  >
                    <SelectTrigger id="idempotencyTtl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60000">1 minute - Quick operations</SelectItem>
                      <SelectItem value="300000">5 minutes - Short transactions</SelectItem>
                      <SelectItem value="900000">15 minutes - Medium operations</SelectItem>
                      <SelectItem value="3600000">1 hour - Standard operations</SelectItem>
                      <SelectItem value="86400000">24 hours - Important operations</SelectItem>
                      <SelectItem value="604800000">7 days - Critical operations</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Responses are cached for this duration. After expiration, new requests will be processed normally.
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label>HTTP Methods</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs p-3">
                          <p className="text-xs font-medium mb-2">Method Guidelines</p>
                          <ul className="text-xs text-gray-300 space-y-1">
                            <li><strong>POST:</strong> Creating new records (recommended)</li>
                            <li><strong>PUT:</strong> Full updates (recommended)</li>
                            <li><strong>PATCH:</strong> Partial updates (use with caution)</li>
                            <li><strong>DELETE:</strong> Already idempotent by nature</li>
                          </ul>
                          <p className="text-xs text-gray-300 mt-2">
                            GET requests don't need idempotency as they don't modify data.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex gap-2">
                    {["POST", "PUT", "PATCH", "DELETE"].map(method => (
                      <label key={method} className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={newEntity.idempotencyMethods.includes(method)}
                          onChange={(e) => {
                            const methods = e.target.checked
                              ? [...newEntity.idempotencyMethods, method]
                              : newEntity.idempotencyMethods.filter(m => m !== method);
                            setNewEntity({ ...newEntity, idempotencyMethods: methods });
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{method}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    POST and PUT modify data and benefit most from idempotency protection.
                  </p>
                </div>
                
                {/* Usage Example */}
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                  <h4 className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
                    How clients should use this:
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                    Send a unique <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">Idempotency-Key</code> header with each request:
                  </p>
                  <pre className="text-xs bg-blue-100 dark:bg-blue-900 p-2 rounded overflow-x-auto">
{`// JavaScript Example
const response = await fetch('/api/v1/${newEntity.name || 'entity'}/records', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': crypto.randomUUID() // Unique key
  },
  body: JSON.stringify({ data: {...} })
});

// Safe to retry with same key if request fails`}</pre>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    \u2713 The server will return the cached response for duplicate requests with the same key
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Schema Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Schema Definition</Label>
              <div className="flex gap-2">
                <Button
                  variant={schemaMode === "ui" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    // When switching to Visual, parse the current Code
                    if (schemaMode === 'code') {
                      const fields = schemaToFields(newEntity.schema);
                      if (fields.length > 0) {
                        setSchemaFields(fields);
                      }
                    }
                    setSchemaMode("ui");
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Visual
                </Button>
                <Button
                  variant={schemaMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    // When switching to Table, parse the current Code if coming from Code mode
                    if (schemaMode === 'code') {
                      const fields = schemaToFields(newEntity.schema);
                      if (fields.length > 0) {
                        setSchemaFields(fields);
                      }
                    }
                    // Update schema if coming from Visual mode
                    if (schemaMode === 'ui') {
                      const schema = fieldsToSchema();
                      setNewEntity(prev => ({
                        ...prev,
                        schema: JSON.stringify(schema, null, 2)
                      }));
                    }
                    setSchemaMode("table");
                  }}
                >
                  <Table2 className="h-4 w-4 mr-2" />
                  Table
                </Button>
                <Button
                  variant={schemaMode === "code" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    // When switching to Code, update the schema
                    if (schemaMode === 'ui' || schemaMode === 'table') {
                      const schema = fieldsToSchema();
                      setNewEntity(prev => ({
                        ...prev,
                        schema: JSON.stringify(schema, null, 2)
                      }));
                    }
                    setSchemaMode("code");
                  }}
                >
                  <Code className="h-4 w-4 mr-2" />
                  Code
                </Button>
              </div>
            </div>

            {schemaMode === "ui" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {schemaFields.map((field, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Field Name</Label>
                            <Input
                              value={field.name}
                              onChange={(e) => updateField(index, { name: e.target.value })}
                              placeholder="field_name"
                            />
                          </div>
                          <div>
                            <Label>Type</Label>
                            <Select
                              value={field.type}
                              onValueChange={(value) => updateField(index, { type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="integer">Integer</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="array">Array</SelectItem>
                                <SelectItem value="object">Object</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <Label>Required</Label>
                              <Switch
                                checked={field.required}
                                onCheckedChange={(checked) => updateField(index, { required: checked })}
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeField(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {field.type === "string" && (
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label>Format</Label>
                              <Select
                                value={field.format || "none"}
                                onValueChange={(value) => updateField(index, { format: value === "none" ? undefined : value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="uri">URL</SelectItem>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="date-time">DateTime</SelectItem>
                                  <SelectItem value="uuid">UUID</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Min Length</Label>
                              <Input
                                type="number"
                                value={field.minLength || ""}
                                onChange={(e) => updateField(index, { 
                                  minLength: e.target.value ? parseInt(e.target.value) : undefined 
                                })}
                              />
                            </div>
                            <div>
                              <Label>Max Length</Label>
                              <Input
                                type="number"
                                value={field.maxLength || ""}
                                onChange={(e) => updateField(index, { 
                                  maxLength: e.target.value ? parseInt(e.target.value) : undefined 
                                })}
                              />
                            </div>
                          </div>
                        )}

                        {(field.type === "number" || field.type === "integer") && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Minimum</Label>
                              <Input
                                type="number"
                                value={field.minimum || ""}
                                onChange={(e) => updateField(index, { 
                                  minimum: e.target.value ? parseFloat(e.target.value) : undefined 
                                })}
                              />
                            </div>
                            <div>
                              <Label>Maximum</Label>
                              <Input
                                type="number"
                                value={field.maximum || ""}
                                onChange={(e) => updateField(index, { 
                                  maximum: e.target.value ? parseFloat(e.target.value) : undefined 
                                })}
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <Label>Description</Label>
                          <Input
                            value={field.description || ""}
                            onChange={(e) => updateField(index, { description: e.target.value || undefined })}
                            placeholder="Field description"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={addField}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>

                {/* Collapsible Schema Code View */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSchemaCode(!showSchemaCode)}
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      View Schema Code
                    </span>
                    <span className="text-xs text-gray-500">
                      {showSchemaCode ? "Hide" : "Show"}
                    </span>
                  </Button>
                  
                  {showSchemaCode && (
                    <Card>
                      <CardContent className="p-0">
                        <div className="relative max-h-64 overflow-y-auto overflow-x-auto rounded-lg">
                          <SyntaxHighlighter 
                            language="json" 
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              padding: '1rem',
                              fontSize: '0.75rem',
                              lineHeight: '1.5',
                              minHeight: '100px',
                            }}
                            showLineNumbers={false}
                          >
                            {schemaMode === 'ui' ? JSON.stringify(fieldsToSchema(), null, 2) : newEntity.schema}
                          </SyntaxHighlighter>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
            
            {schemaMode === "table" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Field Name</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Type</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">Required</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Format</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Min</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Max</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Description</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {schemaFields.map((field, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-3 py-2">
                              <Input
                                value={field.name}
                                onChange={(e) => updateField(index, { name: e.target.value })}
                                className="h-8 text-sm"
                                placeholder="field_name"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Select
                                value={field.type}
                                onValueChange={(value) => updateField(index, { type: value })}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">String</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="integer">Integer</SelectItem>
                                  <SelectItem value="boolean">Boolean</SelectItem>
                                  <SelectItem value="array">Array</SelectItem>
                                  <SelectItem value="object">Object</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Switch
                                checked={field.required}
                                onCheckedChange={(checked) => updateField(index, { required: checked })}
                              />
                            </td>
                            <td className="px-3 py-2">
                              {field.type === "string" && (
                                <Select
                                  value={field.format || "none"}
                                  onValueChange={(value) => updateField(index, { 
                                    format: value === "none" ? undefined : value 
                                  })}
                                >
                                  <SelectTrigger className="h-8 text-sm w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="uri">URL</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="date-time">DateTime</SelectItem>
                                    <SelectItem value="uuid">UUID</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {field.type === "string" ? (
                                <Input
                                  type="number"
                                  value={field.minLength || ""}
                                  onChange={(e) => updateField(index, { 
                                    minLength: e.target.value ? parseInt(e.target.value) : undefined 
                                  })}
                                  className="h-8 text-sm w-16"
                                  placeholder="-"
                                />
                              ) : (field.type === "number" || field.type === "integer") ? (
                                <Input
                                  type="number"
                                  value={field.minimum || ""}
                                  onChange={(e) => updateField(index, { 
                                    minimum: e.target.value ? parseFloat(e.target.value) : undefined 
                                  })}
                                  className="h-8 text-sm w-16"
                                  placeholder="-"
                                />
                              ) : null}
                            </td>
                            <td className="px-3 py-2">
                              {field.type === "string" ? (
                                <Input
                                  type="number"
                                  value={field.maxLength || ""}
                                  onChange={(e) => updateField(index, { 
                                    maxLength: e.target.value ? parseInt(e.target.value) : undefined 
                                  })}
                                  className="h-8 text-sm w-16"
                                  placeholder="-"
                                />
                              ) : (field.type === "number" || field.type === "integer") ? (
                                <Input
                                  type="number"
                                  value={field.maximum || ""}
                                  onChange={(e) => updateField(index, { 
                                    maximum: e.target.value ? parseFloat(e.target.value) : undefined 
                                  })}
                                  className="h-8 text-sm w-16"
                                  placeholder="-"
                                />
                              ) : null}
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={field.description || ""}
                                onChange={(e) => updateField(index, { description: e.target.value || undefined })}
                                className="h-8 text-sm"
                                placeholder="Field description"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeField(index)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={addField}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>

                {/* Collapsible Schema Code View */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSchemaCode(!showSchemaCode)}
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      View Schema Code
                    </span>
                    <span className="text-xs text-gray-500">
                      {showSchemaCode ? "Hide" : "Show"}
                    </span>
                  </Button>
                  
                  {showSchemaCode && (
                    <Card>
                      <CardContent className="p-0">
                        <div className="relative max-h-64 overflow-y-auto overflow-x-auto rounded-lg">
                          <SyntaxHighlighter 
                            language="json" 
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              padding: '1rem',
                              fontSize: '0.75rem',
                              lineHeight: '1.5',
                              minHeight: '100px',
                            }}
                            showLineNumbers={false}
                          >
                            {schemaMode === 'table' ? JSON.stringify(fieldsToSchema(), null, 2) : newEntity.schema}
                          </SyntaxHighlighter>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
            
            {schemaMode === "code" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gray-900 p-2">
                    <Editor
                      value={newEntity.schema}
                      onValueChange={(code) => {
                        setNewEntity({ ...newEntity, schema: code });
                        
                        // Real-time validation
                        try {
                          const parsed = JSON.parse(code);
                          if (parsed.type === 'object' && parsed.properties) {
                            setCodeError("");
                          } else {
                            setCodeError("Schema must have type 'object' and 'properties'");
                          }
                        } catch (e) {
                          setCodeError("Invalid JSON syntax");
                        }
                      }}
                      highlight={(code) => highlight(code, languages.json, 'json')}
                      padding={10}
                      className="font-mono text-sm min-h-[384px]"
                      style={{
                        fontFamily: '"Fira code", "Fira Mono", monospace',
                        fontSize: 14,
                        backgroundColor: '#1e1e1e',
                        color: '#d4d4d4',
                      }}
                      textareaClassName="outline-none"
                      preClassName="language-json"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {codeError ? (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-600 dark:text-red-400">
                        {codeError}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">
                        Valid JSON Schema
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </SlidingPanel>

      {/* Create Record Panel */}
      <SlidingPanel
        isOpen={showCreateRecord}
        onClose={() => {
          setShowCreateRecord(false);
          setNewRecordData("{}");
          setRecordValidationError("");
        }}
        title="Create New Record"
        description={`Add a new record to ${activeTab?.entity.display_name}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateRecord(false);
                setNewRecordData("{}");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateRecord}
              disabled={createRecordMutation.isPending}
            >
              {createRecordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Record
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="recordData">Record Data (JSON)</Label>
            <Textarea
              id="recordData"
              className="font-mono text-sm h-64"
              placeholder={`{\n  "name": "Example Value",\n  "description": "Sample record"\n}`}
              value={newRecordData}
              onChange={(e) => {
                setNewRecordData(e.target.value);
                // Live validation
                try {
                  const data = JSON.parse(e.target.value);
                  const tab = openTabs.find(t => t.entityId === activeTabId);
                  if (tab && tab.entity.schema) {
                    const validation = validateDataAgainstSchema(data, tab.entity.schema);
                    setRecordValidationError(validation.valid ? "" : formatValidationErrors(validation.errors));
                  }
                } catch {
                  setRecordValidationError("Invalid JSON format");
                }
              }}
            />
            {recordValidationError && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">Validation Errors:</p>
                <pre className="text-xs text-red-500 dark:text-red-400 whitespace-pre-wrap mt-1">{recordValidationError}</pre>
              </div>
            )}
          </div>
          
          {activeTab && activeTab.entity.schema && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Schema Reference</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="rounded-lg overflow-hidden max-h-32 overflow-auto">
                  <SyntaxHighlighter 
                    language="json" 
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: '0.75rem',
                      fontSize: '0.75rem',
                      lineHeight: '1.5',
                    }}
                    showLineNumbers={false}
                  >
                    {JSON.stringify(activeTab.entity.schema, null, 2)}
                  </SyntaxHighlighter>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SlidingPanel>

      {/* View/Edit Record Panel */}
      <SlidingPanel
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="View/Edit Record"
        description={`Record ID: ${selectedRecord?.id}`}
        size="md"
        footer={
          <div className="flex justify-between">
            <Button 
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={() => {
                handleDeleteRecord(selectedRecord);
                setSelectedRecord(null);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Record
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setSelectedRecord(null)}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const textarea = document.getElementById('editRecordData') as HTMLTextAreaElement;
                  if (textarea) {
                    handleUpdateRecord(selectedRecord, textarea.value);
                  }
                }}
                disabled={updateRecordMutation.isPending}
              >
                {updateRecordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Record
              </Button>
            </div>
          </div>
        }
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="editRecordData">Record Data (JSON)</Label>
              <Textarea
                id="editRecordData"
                className="font-mono text-sm h-64"
                defaultValue={JSON.stringify(selectedRecord.data, null, 2)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="font-medium">Created</Label>
                <p className="text-gray-500">
                  {new Date(selectedRecord.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <Label className="font-medium">Updated</Label>
                <p className="text-gray-500">
                  {new Date(selectedRecord.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
            
            {activeTab && activeTab.entity.schema && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Schema Reference</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="rounded-lg overflow-hidden max-h-32 overflow-auto">
                    <SyntaxHighlighter 
                      language="json" 
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        padding: '0.75rem',
                        fontSize: '0.75rem',
                        lineHeight: '1.5',
                      }}
                      showLineNumbers={false}
                    >
                      {JSON.stringify(activeTab.entity.schema, null, 2)}
                    </SyntaxHighlighter>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </SlidingPanel>
    </div>
  );
}