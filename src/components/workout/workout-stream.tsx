"use client";

import { useMemo } from "react";
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

interface WorkoutSection {
  type: "warmup" | "main" | "cooldown" | "coaching" | "other";
  title: string;
  content: string;
}

function classifySection(heading: string): WorkoutSection["type"] {
  const h = heading.toLowerCase();
  if (h.includes("warm")) return "warmup";
  if (h.includes("main") || h.includes("workout")) return "main";
  if (h.includes("cool")) return "cooldown";
  if (h.includes("coach") || h.includes("note") || h.includes("tip")) return "coaching";
  return "other";
}

function parseSections(markdown: string): WorkoutSection[] {
  const sections: WorkoutSection[] = [];
  const parts = markdown.split(/^## /m);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    if (i === 0) {
      if (part.length > 0) {
        sections.push({ type: "other", title: "", content: part });
      }
      continue;
    }

    const newlineIdx = part.indexOf("\n");
    const title = newlineIdx === -1 ? part : part.slice(0, newlineIdx).trim();
    const body = newlineIdx === -1 ? "" : part.slice(newlineIdx + 1).trim();
    const type = classifySection(title);

    sections.push({ type, title, content: body });
  }

  return sections;
}

function SectionCard({ section }: { section: WorkoutSection }) {
  return (
    <div className="border border-border">
      {section.title && (
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-black text-xs uppercase tracking-[0.2em]">
            {section.title}
          </h2>
        </div>
      )}
      <div className="px-4 py-3">
        <div className="prose prose-sm dark:prose-invert max-w-none prose-table:w-full prose-th:text-left prose-th:px-3 prose-th:py-2 prose-th:bg-muted/50 prose-th:font-semibold prose-th:text-xs prose-th:uppercase prose-th:tracking-wider prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-muted prose-tr:last:*:border-0 prose-table:border prose-table:overflow-hidden prose-ol:space-y-1 prose-ul:space-y-1 prose-li:text-sm prose-h3:text-sm prose-h3:font-black prose-h3:uppercase prose-h3:tracking-wider prose-h3:mt-4 prose-h3:mb-2 prose-p:text-sm prose-p:leading-relaxed">
          <ReactMarkdown>{section.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export function WorkoutStream({ content, isStreaming, error, onSave }: WorkoutStreamProps) {
  const sections = useMemo(() => {
    if (!content) return [];
    return parseSections(content);
  }, [content]);

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!content && !isStreaming) return null;

  function handleCopy() {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  }

  const hasSections = sections.length > 0 && sections.some((s) => s.type !== "other");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isStreaming && <Loader2 className="h-4 w-4 animate-spin" />}
            {isStreaming ? "Generating..." : "Workout"}
          </CardTitle>
          {content && !isStreaming && (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={handleCopy} title="Copy">
                <Copy className="h-4 w-4" />
              </Button>
              {onSave && (
                <Button size="icon" variant="ghost" onClick={onSave} title="Save">
                  <Save className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasSections && !isStreaming ? (
          <div className="space-y-3">
            {sections.map((section, i) => (
              <SectionCard key={i} section={section} />
            ))}
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
