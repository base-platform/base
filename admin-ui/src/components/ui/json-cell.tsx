"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Copy, Eye, FileJson } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface JsonCellProps {
  data: any;
  maxHeight?: string;
  expandable?: boolean;
  copyable?: boolean;
  className?: string;
}

export function JsonCell({ 
  data, 
  maxHeight = "80px",
  expandable = true,
  copyable = true,
  className 
}: JsonCellProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const isLongContent = jsonString.length > 100 || jsonString.split('\n').length > 3;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(jsonString);
    toast.success("JSON copied to clipboard");
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDialog(true);
  };

  return (
    <>
      <div 
        className={cn(
          "relative group",
          className
        )}
      >
        <div
          className={cn(
            "bg-gray-50 dark:bg-gray-900 rounded p-2 font-mono text-xs overflow-hidden transition-all",
            !isExpanded && isLongContent && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
          style={{ maxHeight: !isExpanded ? maxHeight : 'none' }}
          onClick={() => expandable && isLongContent && setIsExpanded(!isExpanded)}
        >
          <pre className="whitespace-pre-wrap break-words">
            {jsonString}
          </pre>
          
          {!isExpanded && isLongContent && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent pointer-events-none" />
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {copyable && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 bg-white dark:bg-gray-800"
              onClick={handleCopy}
              title="Copy JSON"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
          {expandable && isLongContent && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 bg-white dark:bg-gray-800"
              onClick={handleExpand}
              title="View full JSON"
            >
              <Eye className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Expand/Collapse indicator */}
        {expandable && isLongContent && !isExpanded && (
          <div className="absolute bottom-1 left-1">
            <ChevronRight className="h-3 w-3 text-gray-400" />
          </div>
        )}
      </div>

      {/* Full view dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              JSON Data Viewer
            </DialogTitle>
            <DialogDescription>
              Full JSON data with syntax highlighting
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-lg">
            <SyntaxHighlighter 
              language="json" 
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '1rem',
                fontSize: '0.875rem',
                lineHeight: '1.5',
              }}
              showLineNumbers={true}
            >
              {jsonString}
            </SyntaxHighlighter>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(jsonString);
                toast.success("JSON copied to clipboard");
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Compact version for inline use
export function JsonBadge({ data, maxLength = 50 }: { data: any; maxLength?: number }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
  const displayString = jsonString.length > maxLength 
    ? `${jsonString.substring(0, maxLength)}...` 
    : jsonString;

  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
      onClick={() => {
        navigator.clipboard.writeText(jsonString);
        toast.success("JSON copied to clipboard");
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <FileJson className="h-3 w-3" />
      {displayString}
      {showTooltip && jsonString.length > maxLength && (
        <div className="absolute z-50 p-2 bg-gray-900 text-white rounded shadow-lg text-xs max-w-md">
          <pre className="whitespace-pre-wrap">{jsonString}</pre>
        </div>
      )}
    </span>
  );
}