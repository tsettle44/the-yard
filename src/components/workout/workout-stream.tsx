"use client";

import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WorkoutStreamProps {
  content: string;
  isStreaming: boolean;
  error: string | null;
  onSave?: () => void;
}

export function WorkoutStream({ content, isStreaming, error, onSave }: WorkoutStreamProps) {
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!content && !isStreaming) return null;

  function handleCopy() {
    navigator.clipboard.writeText(content);
    toast.success("Workout copied to clipboard");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {isStreaming && <Loader2 className="h-4 w-4 animate-spin" />}
            {isStreaming ? "Generating..." : "Your Workout"}
          </CardTitle>
          {content && !isStreaming && (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
              {onSave && (
                <Button size="icon" variant="ghost" onClick={onSave}>
                  <Save className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
