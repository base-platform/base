"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FunctionSquare, 
  Code, 
  Zap, 
  Clock, 
  Settings, 
  Play,
  GitBranch,
  Database,
  Globe
} from "lucide-react";

export default function FunctionsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <FunctionSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Functions</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Serverless functions and runtime execution environment
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          Coming Soon
        </Badge>
      </div>

      {/* Coming Soon Banner */}
      <Card className="border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Zap className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-100">
              Functions Module Coming Soon
            </h2>
            <p className="text-blue-700 dark:text-blue-300 max-w-md">
              We're building powerful serverless function capabilities. Stay tuned for updates!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Planned Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Function Editor</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Built-in code editor with syntax highlighting, auto-completion, and real-time validation for writing serverless functions.
            </CardDescription>
            <div className="mt-4">
              <Badge variant="outline" className="text-xs">
                Code Editor
              </Badge>
              <Badge variant="outline" className="text-xs ml-2">
                Syntax Highlighting
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">Runtime Execution</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Execute functions in isolated environments with support for multiple runtimes including Node.js, Python, and more.
            </CardDescription>
            <div className="mt-4">
              <Badge variant="outline" className="text-xs">
                Node.js
              </Badge>
              <Badge variant="outline" className="text-xs ml-2">
                Python
              </Badge>
              <Badge variant="outline" className="text-xs ml-2">
                Isolated
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg">Scheduling & Triggers</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Schedule functions to run at specific times or trigger them based on events, webhooks, or API calls.
            </CardDescription>
            <div className="mt-4">
              <Badge variant="outline" className="text-xs">
                Cron Jobs
              </Badge>
              <Badge variant="outline" className="text-xs ml-2">
                Webhooks
              </Badge>
              <Badge variant="outline" className="text-xs ml-2">
                API Triggers
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Version Control</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Maintain different versions of your functions with rollback capabilities and deployment history.
            </CardDescription>
            <div className="mt-4">
              <Badge variant="outline" className="text-xs">
                Versioning
              </Badge>
              <Badge variant="outline" className="text-xs ml-2">
                Rollback
              </Badge>
              <Badge variant="outline" className="text-xs ml-2">
                History
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-lg">Data Integration</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Seamlessly connect functions to your entities and external databases with built-in ORM and query capabilities.
            </CardDescription>
            <div className="mt-4">
              <Badge variant="outline" className="text-xs">
                Entity Access
              </Badge>
              <Badge variant="outline" className="text-xs ml-2">
                Database
              </Badge>
              <Badge variant="outline" className="text-xs ml-2">
                ORM
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-teal-600" />
              <CardTitle className="text-lg">API Endpoints</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Expose functions as REST API endpoints with automatic documentation and rate limiting.
            </CardDescription>
            <div className="mt-4">
              <Badge variant="outline" className="text-xs">
                REST API
              </Badge>
              <Badge variant="outline" className="text-xs ml-2">
                Auto Docs
              </Badge>
              <Badge variant="outline" className="text-xs ml-2">
                Rate Limiting
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notify Me Section */}
      <Card>
        <CardHeader>
          <CardTitle>Get Notified</CardTitle>
          <CardDescription>
            Want to be the first to know when Functions are available?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Functions will enable you to build serverless applications with automatic scaling, 
            built-in monitoring, and seamless integration with your existing entities and APIs.
          </p>
          <div className="flex items-center gap-3">
            <Button disabled className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Enable Notifications
            </Button>
            <span className="text-xs text-gray-500">Feature in development</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}