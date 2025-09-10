"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Download,
  ExternalLink,
  RefreshCw,
  Code2,
  FileJson,
  Copy,
  Check,
  Loader2,
  Info
} from "lucide-react";
import { toast } from "sonner";

export default function ApiDocsPage() {
  const [apiSpec, setApiSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("endpoints");

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  const SERVER_BASE_URL = API_BASE_URL.replace('/api/v1', '');
  const SWAGGER_URL = `${SERVER_BASE_URL}/api/docs`;
  const SPEC_URL = `${SERVER_BASE_URL}/api/docs-json`;

  useEffect(() => {
    loadApiSpec();
  }, []);

  const loadApiSpec = async () => {
    try {
      setLoading(true);
      const response = await fetch(SPEC_URL);
      const spec = await response.json();
      setApiSpec(spec);
    } catch (error) {
      console.error('Failed to load API specification:', error);
      toast.error('Failed to load API documentation');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, endpoint: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpoint);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const downloadSpec = () => {
    if (!apiSpec) return;
    
    const blob = new Blob([JSON.stringify(apiSpec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openapi-spec.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('OpenAPI specification downloaded');
  };

  const renderEndpointsList = () => {
    if (!apiSpec || !apiSpec.paths) return null;

    const endpoints = Object.entries(apiSpec.paths).flatMap(([path, methods]: [string, any]) =>
      Object.entries(methods).map(([method, details]: [string, any]) => ({
        path,
        method: method.toUpperCase(),
        summary: details.summary || 'No summary',
        tags: details.tags || [],
        operationId: details.operationId
      }))
    );

    const groupedEndpoints = endpoints.reduce((acc, endpoint) => {
      const tag = endpoint.tags[0] || 'General';
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(endpoint);
      return acc;
    }, {} as Record<string, typeof endpoints>);

    return (
      <div className="space-y-6">
        {Object.entries(groupedEndpoints).map(([tag, endpoints]) => (
          <Card key={tag}>
            <CardHeader>
              <CardTitle className="text-lg">{tag}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {endpoints.map((endpoint, idx) => (
                  <div
                    key={`${endpoint.path}-${endpoint.method}-${idx}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        className={`font-mono ${
                          endpoint.method === 'GET' ? 'bg-green-500 hover:bg-green-600 text-white' :
                          endpoint.method === 'POST' ? 'bg-blue-500 hover:bg-blue-600 text-white' :
                          endpoint.method === 'PUT' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
                          endpoint.method === 'PATCH' ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                          endpoint.method === 'DELETE' ? 'bg-red-500 hover:bg-red-600 text-white' :
                          'bg-gray-500 hover:bg-gray-600 text-white'
                        }`}
                      >
                        {endpoint.method}
                      </Badge>
                      <div>
                        <code className="text-sm">{endpoint.path}</code>
                        <p className="text-xs text-muted-foreground mt-1">{endpoint.summary}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(
                        `${SERVER_BASE_URL}${endpoint.path}`,
                        `${endpoint.path}-${endpoint.method}`
                      )}
                    >
                      {copiedEndpoint === `${endpoint.path}-${endpoint.method}` ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              OpenAPI Documentation
            </h1>
            <p className="text-muted-foreground mt-2">
              Interactive API documentation powered by OpenAPI 3.0 specification
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadApiSpec}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={downloadSpec}
              disabled={!apiSpec}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Spec
            </Button>
            <Button
              variant="default"
              onClick={() => window.open(SWAGGER_URL, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Swagger UI
            </Button>
          </div>
        </div>
      </div>

      {/* API Info */}
      {apiSpec && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{apiSpec.info?.title}</CardTitle>
            <CardDescription>
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: apiSpec.info?.description?.replace(/\n/g, '<br />').replace(/•/g, '&bull;') || ''
                }}
              />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">Version</p>
                <p className="text-sm text-muted-foreground">{apiSpec.info?.version}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Base URL</p>
                <code className="text-sm text-muted-foreground">{API_BASE_URL}</code>
              </div>
              <div>
                <p className="text-sm font-medium">OpenAPI Version</p>
                <p className="text-sm text-muted-foreground">{apiSpec.openapi || '3.0.0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* HTTP Methods Legend */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm font-medium">HTTP Methods:</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500 text-white text-xs">GET</Badge>
              <span className="text-xs text-muted-foreground">Read</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500 text-white text-xs">POST</Badge>
              <span className="text-xs text-muted-foreground">Create</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-500 text-white text-xs">PUT</Badge>
              <span className="text-xs text-muted-foreground">Update</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-500 text-white text-xs">PATCH</Badge>
              <span className="text-xs text-muted-foreground">Partial Update</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-500 text-white text-xs">DELETE</Badge>
              <span className="text-xs text-muted-foreground">Remove</span>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-[400px]">
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="schemas">Schemas</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="mt-6">
          {renderEndpointsList()}
        </TabsContent>

        <TabsContent value="schemas" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Data Schemas
              </CardTitle>
              <CardDescription>
                Request and response data models used by the API
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apiSpec?.components?.schemas ? (
                <div className="space-y-4">
                  {Object.entries(apiSpec.components.schemas).map(([name, schema]: [string, any]) => (
                    <div key={name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-mono font-medium">{name}</h3>
                        <Badge variant="outline">{schema.type || 'object'}</Badge>
                      </div>
                      {schema.description && (
                        <p className="text-sm text-muted-foreground mb-2">{schema.description}</p>
                      )}
                      {schema.properties && (
                        <div className="space-y-1">
                          {Object.entries(schema.properties).map(([prop, details]: [string, any]) => (
                            <div key={prop} className="flex items-center gap-2 text-sm">
                              <code className="text-blue-600 dark:text-blue-400">{prop}</code>
                              <span className="text-muted-foreground">:</span>
                              <span className="text-muted-foreground">{details.type}</span>
                              {schema.required?.includes(prop) && (
                                <Badge variant="secondary" className="text-xs">required</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No schemas defined</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About OpenAPI Documentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              This documentation is automatically generated from the API's OpenAPI 3.0 specification.
            </p>
            <p>
              Use the Swagger UI tab to interactively test API endpoints with authentication.
            </p>
            <p>
              The Endpoints tab provides a quick overview of all available API operations.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="secondary">OpenAPI 3.0</Badge>
              <Badge variant="secondary">Auto-generated</Badge>
              <Badge variant="secondary">Interactive Testing</Badge>
              <Badge variant="secondary">Schema Validation</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}