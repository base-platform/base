"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-tomorrow.css';
import {
  Rocket,
  Send,
  Code2,
  FileJson,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  PlayCircle,
  History,
  Trash2,
  Download,
  ChevronDown,
  ChevronRight,
  Key,
  Plus,
  X
} from "lucide-react";

interface RequestHistory {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  request: {
    headers: Record<string, string>;
    body?: any;
    params?: Record<string, string>;
  };
  response?: {
    headers: Record<string, string>;
    body: any;
  };
  error?: string;
}

interface ApiEndpoint {
  path: string;
  method: string;
  summary?: string;
  parameters?: any[];
  requestBody?: any;
  responses?: any;
}

export default function ApiExplorerPage() {
  const { user } = useAuth();
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<Array<{ key: string; value: string; enabled: boolean }>>([
    { key: "Content-Type", value: "application/json", enabled: true },
    { key: "Authorization", value: "", enabled: true }
  ]);
  const [params, setParams] = useState<Array<{ key: string; value: string; enabled: boolean }>>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("response");
  const [apiSpec, setApiSpec] = useState<any>(null);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [showEndpoints, setShowEndpoints] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

  useEffect(() => {
    // Set default URL
    setUrl(API_BASE_URL);
    
    // Load API spec
    loadApiSpec();
    
    // Load history from localStorage
    const savedHistory = localStorage.getItem('api_explorer_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    // Set authorization header with current token
    const token = localStorage.getItem('access_token');
    if (token) {
      setHeaders(prev => prev.map(h => 
        h.key === 'Authorization' ? { ...h, value: `Bearer ${token}` } : h
      ));
    }
  }, []);

  const loadApiSpec = async () => {
    try {
      const response = await fetch(API_BASE_URL.replace('/api/v1', '/api/docs-json'));
      const spec = await response.json();
      setApiSpec(spec);
      
      // Extract endpoints
      const endpointsList: ApiEndpoint[] = [];
      if (spec.paths) {
        Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
          Object.entries(methods).forEach(([method, details]: [string, any]) => {
            endpointsList.push({
              path,
              method: method.toUpperCase(),
              summary: details.summary,
              parameters: details.parameters,
              requestBody: details.requestBody,
              responses: details.responses
            });
          });
        });
      }
      setEndpoints(endpointsList);
    } catch (error) {
      console.error('Failed to load API spec:', error);
    }
  };

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "", enabled: true }]);
  };

  const updateHeader = (index: number, field: 'key' | 'value' | 'enabled', value: any) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const addParam = () => {
    setParams([...params, { key: "", value: "", enabled: true }]);
  };

  const updateParam = (index: number, field: 'key' | 'value' | 'enabled', value: any) => {
    const newParams = [...params];
    newParams[index] = { ...newParams[index], [field]: value };
    setParams(newParams);
  };

  const removeParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index));
  };

  const buildUrl = () => {
    const enabledParams = params.filter(p => p.enabled && p.key);
    if (enabledParams.length === 0) return url;
    
    const queryString = enabledParams
      .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    
    return `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
  };

  const sendRequest = async () => {
    setLoading(true);
    setResponse(null);
    setResponseTime(null);
    
    const startTime = Date.now();
    const requestId = Date.now().toString();
    
    try {
      const enabledHeaders = headers
        .filter(h => h.enabled && h.key)
        .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {} as Record<string, string>);

      const requestOptions: RequestInit = {
        method,
        headers: enabledHeaders,
      };

      if (method !== 'GET' && method !== 'HEAD' && body) {
        requestOptions.body = body;
      }

      const finalUrl = buildUrl();
      const res = await fetch(finalUrl, requestOptions);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setResponseTime(duration);
      
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody;
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseBody = await res.json();
      } else {
        responseBody = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: responseBody
      });

      // Add to history
      const historyItem: RequestHistory = {
        id: requestId,
        timestamp: new Date(),
        method,
        url: finalUrl,
        status: res.status,
        duration,
        request: {
          headers: enabledHeaders,
          body: body ? JSON.parse(body) : undefined,
          params: params.filter(p => p.enabled).reduce((acc, p) => ({ ...acc, [p.key]: p.value }), {})
        },
        response: {
          headers: responseHeaders,
          body: responseBody
        }
      };

      const newHistory = [historyItem, ...history.slice(0, 19)]; // Keep last 20 items
      setHistory(newHistory);
      localStorage.setItem('api_explorer_history', JSON.stringify(newHistory));

      if (res.ok) {
        toast.success(`Request successful (${res.status})`);
      } else {
        toast.error(`Request failed (${res.status})`);
      }
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setResponseTime(duration);
      setResponse({
        error: error.message || 'Request failed',
        details: error
      });
      
      toast.error('Request failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (item: RequestHistory) => {
    setMethod(item.method);
    setUrl(item.url.split('?')[0]);
    
    // Load headers
    const newHeaders = Object.entries(item.request.headers).map(([key, value]) => ({
      key,
      value,
      enabled: true
    }));
    setHeaders(newHeaders);
    
    // Load params
    if (item.request.params) {
      const newParams = Object.entries(item.request.params).map(([key, value]) => ({
        key,
        value: value as string,
        enabled: true
      }));
      setParams(newParams);
    }
    
    // Load body
    if (item.request.body) {
      setBody(JSON.stringify(item.request.body, null, 2));
    }
    
    setSelectedHistory(item.id);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('api_explorer_history');
    toast.success('History cleared');
  };

  const selectEndpoint = (endpoint: ApiEndpoint) => {
    setMethod(endpoint.method);
    setUrl(`${API_BASE_URL}${endpoint.path}`);
    setShowEndpoints(false);
    
    // Set up parameters if any
    if (endpoint.parameters) {
      const queryParams = endpoint.parameters
        .filter((p: any) => p.in === 'query')
        .map((p: any) => ({
          key: p.name,
          value: '',
          enabled: true
        }));
      setParams(queryParams);
    }
    
    // Set up request body example if any
    if (endpoint.requestBody?.content?.['application/json']?.schema) {
      const exampleBody = generateExampleFromSchema(endpoint.requestBody.content['application/json'].schema);
      setBody(JSON.stringify(exampleBody, null, 2));
    }
  };

  const generateExampleFromSchema = (schema: any): any => {
    if (schema.example) return schema.example;
    
    if (schema.type === 'object' && schema.properties) {
      const example: any = {};
      Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
        if (prop.example !== undefined) {
          example[key] = prop.example;
        } else if (prop.type === 'string') {
          example[key] = 'string';
        } else if (prop.type === 'number' || prop.type === 'integer') {
          example[key] = 0;
        } else if (prop.type === 'boolean') {
          example[key] = false;
        } else if (prop.type === 'array') {
          example[key] = [];
        } else if (prop.type === 'object') {
          example[key] = {};
        }
      });
      return example;
    }
    
    return {};
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-explorer-history-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('History exported');
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Rocket className="h-8 w-8" />
              Interactive API Explorer
            </h1>
            <p className="text-muted-foreground mt-2">
              Test and debug API endpoints with a powerful interactive interface
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowEndpoints(!showEndpoints)}
          >
            <FileJson className="h-4 w-4 mr-2" />
            Browse Endpoints
          </Button>
        </div>
      </div>

      {/* Endpoints Browser */}
      {showEndpoints && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Available Endpoints</CardTitle>
            <CardDescription>Click an endpoint to load it</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] overflow-y-auto">
              <div className="space-y-2">
                {endpoints.map((endpoint, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectEndpoint(endpoint)}
                    className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          endpoint.method === 'GET' ? 'default' :
                          endpoint.method === 'POST' ? 'secondary' :
                          endpoint.method === 'PUT' ? 'outline' :
                          endpoint.method === 'DELETE' ? 'destructive' :
                          'default'
                        }
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm">{endpoint.path}</code>
                    </div>
                    {endpoint.summary && (
                      <p className="text-xs text-muted-foreground mt-1">{endpoint.summary}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Builder */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Request Builder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Method and URL */}
              <div className="flex gap-2">
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                    <SelectItem value="HEAD">HEAD</SelectItem>
                    <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter request URL"
                  className="flex-1"
                />
                <Button onClick={sendRequest} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {loading ? 'Sending...' : 'Send'}
                </Button>
              </div>

              <Separator />

              <Tabs defaultValue="headers" className="w-full">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="headers">Headers</TabsTrigger>
                  <TabsTrigger value="params">Query Params</TabsTrigger>
                  <TabsTrigger value="body">Body</TabsTrigger>
                </TabsList>

                <TabsContent value="headers" className="space-y-2">
                  {headers.map((header, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        checked={header.enabled}
                        onChange={(e) => updateHeader(index, 'enabled', e.target.checked)}
                        className="rounded"
                      />
                      <Input
                        value={header.key}
                        onChange={(e) => updateHeader(index, 'key', e.target.value)}
                        placeholder="Header name"
                        className="flex-1"
                      />
                      <Input
                        value={header.value}
                        onChange={(e) => updateHeader(index, 'value', e.target.value)}
                        placeholder="Header value"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHeader(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addHeader} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Header
                  </Button>
                </TabsContent>

                <TabsContent value="params" className="space-y-2">
                  {params.map((param, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        checked={param.enabled}
                        onChange={(e) => updateParam(index, 'enabled', e.target.checked)}
                        className="rounded"
                      />
                      <Input
                        value={param.key}
                        onChange={(e) => updateParam(index, 'key', e.target.value)}
                        placeholder="Param name"
                        className="flex-1"
                      />
                      <Input
                        value={param.value}
                        onChange={(e) => updateParam(index, 'value', e.target.value)}
                        placeholder="Param value"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParam(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addParam} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Parameter
                  </Button>
                </TabsContent>

                <TabsContent value="body">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-900 dark:bg-gray-950">
                      <Editor
                        value={body}
                        onValueChange={setBody}
                        highlight={(code) => highlight(code || '', languages.json, 'json')}
                        padding={16}
                        style={{
                          fontFamily: '"Fira code", "Fira Mono", monospace',
                          fontSize: 14,
                          minHeight: '200px',
                          backgroundColor: 'transparent',
                          color: '#f8f8f2'
                        }}
                        textareaClassName="outline-none"
                        placeholder="Enter request body (JSON)..."
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Response */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Response</span>
                {responseTime !== null && (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {responseTime}ms
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {response ? (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="response">Body</TabsTrigger>
                    <TabsTrigger value="headers">Headers</TabsTrigger>
                    <TabsTrigger value="raw">Raw</TabsTrigger>
                  </TabsList>

                  <TabsContent value="response">
                    {response.error ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{response.error}</AlertDescription>
                      </Alert>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={response.status < 400 ? 'default' : 'destructive'}>
                            {response.status} {response.statusText}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(JSON.stringify(response.body, null, 2))}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="h-[400px] overflow-y-auto rounded-lg">
                          <SyntaxHighlighter
                            language={typeof response.body === 'object' ? 'json' : 'text'}
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                            }}
                            showLineNumbers={true}
                          >
                            {typeof response.body === 'object' 
                              ? JSON.stringify(response.body, null, 2)
                              : String(response.body)}
                          </SyntaxHighlighter>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="headers">
                    <div className="h-[400px] overflow-y-auto">
                      <div className="space-y-2">
                        {Object.entries(response.headers || {}).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="font-medium">{key}:</span>
                            <span className="text-muted-foreground">{value as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="raw">
                    <div className="h-[400px] overflow-y-auto rounded-lg">
                      <SyntaxHighlighter
                        language="json"
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                        }}
                        showLineNumbers={true}
                      >
                        {JSON.stringify(response, null, 2)}
                      </SyntaxHighlighter>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <PlayCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Send a request to see the response</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  History
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={exportHistory}
                    disabled={history.length === 0}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    disabled={history.length === 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] overflow-y-auto">
                <div className="space-y-2">
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No requests yet
                    </p>
                  ) : (
                    history.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className={`w-full text-left p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          selectedHistory === item.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge
                            variant={
                              item.method === 'GET' ? 'default' :
                              item.method === 'POST' ? 'secondary' :
                              item.method === 'PUT' ? 'outline' :
                              item.method === 'DELETE' ? 'destructive' :
                              'default'
                            }
                            className="text-xs"
                          >
                            {item.method}
                          </Badge>
                          <Badge
                            variant={
                              !item.status ? 'destructive' :
                              item.status < 400 ? 'default' : 'destructive'
                            }
                            className="text-xs"
                          >
                            {item.status || 'Error'}
                          </Badge>
                        </div>
                        <p className="text-xs truncate mb-1">{item.url}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                          {item.duration && (
                            <span>{item.duration}ms</span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}