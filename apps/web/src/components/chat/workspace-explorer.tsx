"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import {
  FolderOpen,
  FolderClosed,
  File,
  ChevronRight,
  ArrowLeft,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { AgentRunRole } from "@omakase/db";
import { ROLE_PALETTE } from "@/lib/chat-constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileEntry {
  name: string;
  type: "file" | "dir";
  size: number;
  modifiedAt: string;
}

interface TreeNode extends FileEntry {
  path: string;
  children?: TreeNode[];
  loaded?: boolean;
  expanded?: boolean;
}

// ---------------------------------------------------------------------------
// Props — supports three modes:
//   1. runId mode (chat sidebar): uses /api/work-sessions/:runId/files
//   2. agent workspace mode: uses /api/agents/:agentName/workspace/files
//   3. project workspace mode (global): uses /api/workspace/files
// ---------------------------------------------------------------------------

type WorkspaceExplorerProps = {
  role?: AgentRunRole;
  onClose?: () => void;
  /** Hide the header bar (useful when embedded in a page with its own header) */
  hideHeader?: boolean;
} & (
  | { runId: string; agentName?: undefined; projectId?: undefined }
  | { runId?: undefined; agentName: string; projectId: string }
  | { runId?: undefined; agentName?: undefined; projectId: string }
);

// ---------------------------------------------------------------------------
// URL helpers — build API paths based on which mode we're in
// ---------------------------------------------------------------------------

function makeFilesUrl(props: { runId?: string; agentName?: string; projectId?: string }, path: string): string {
  if (props.runId) {
    return `/api/work-sessions/${props.runId}/files?path=${encodeURIComponent(path)}`;
  }
  if (props.agentName) {
    return `/api/agents/${props.agentName}/workspace/files?projectId=${encodeURIComponent(props.projectId!)}&path=${encodeURIComponent(path)}`;
  }
  return `/api/workspace/files?projectId=${encodeURIComponent(props.projectId!)}&path=${encodeURIComponent(path)}`;
}

function makeFileUrl(props: { runId?: string; agentName?: string; projectId?: string }, path: string): string {
  if (props.runId) {
    return `/api/work-sessions/${props.runId}/file?path=${encodeURIComponent(path)}`;
  }
  if (props.agentName) {
    return `/api/agents/${props.agentName}/workspace/file?projectId=${encodeURIComponent(props.projectId!)}&path=${encodeURIComponent(path)}`;
  }
  return `/api/workspace/file?projectId=${encodeURIComponent(props.projectId!)}&path=${encodeURIComponent(path)}`;
}

// ---------------------------------------------------------------------------
// WorkspaceExplorer — collapsible file tree + file viewer panel
// ---------------------------------------------------------------------------

export function WorkspaceExplorer(props: WorkspaceExplorerProps) {
  const { role, onClose, hideHeader } = props;
  const palette = role ? ROLE_PALETTE[role] : null;
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // File viewer state
  const [viewingFile, setViewingFile] = useState<{ path: string; content: string; size: number } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  // Stable key for endpoint identity — changes when source switches
  const endpointKey = useMemo(
    () => props.runId ?? (props.agentName ? `${props.agentName}:${props.projectId}` : props.projectId ?? ""),
    [props.runId, props.agentName, props.projectId],
  );

  // Fetch directory entries
  const fetchDir = useCallback(
    async (path: string): Promise<FileEntry[]> => {
      const result = await apiFetch<{ entries: FileEntry[] }>(makeFilesUrl(props, path));
      return result.entries;
    },
    [endpointKey],
  );

  // Load root directory on mount or when source changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setTree([]);
    setViewingFile(null);

    (async () => {
      try {
        const entries = await fetchDir("/");
        if (!cancelled) {
          setTree(
            entries.map((e) => ({
              ...e,
              path: `/${e.name}`,
              children: e.type === "dir" ? [] : undefined,
              loaded: false,
              expanded: false,
            })),
          );
        }
      } catch {
        if (!cancelled) setError("Failed to load workspace");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchDir]);

  // Toggle a directory open/closed
  const toggleDir = useCallback(
    async (path: string) => {
      const updateNodes = (nodes: TreeNode[]): TreeNode[] =>
        nodes.map((node) => {
          if (node.path === path && node.type === "dir") {
            return { ...node, expanded: !node.expanded };
          }
          if (node.children) {
            return { ...node, children: updateNodes(node.children) };
          }
          return node;
        });

      // Check if already loaded
      const findNode = (nodes: TreeNode[]): TreeNode | undefined => {
        for (const n of nodes) {
          if (n.path === path) return n;
          if (n.children) {
            const found = findNode(n.children);
            if (found) return found;
          }
        }
      };

      const node = findNode(tree);
      if (node && !node.loaded) {
        try {
          const entries = await fetchDir(path);
          const children = entries.map((e) => ({
            ...e,
            path: `${path}/${e.name}`,
            children: e.type === "dir" ? [] : undefined,
            loaded: false,
            expanded: false,
          }));

          const loadAndExpand = (nodes: TreeNode[]): TreeNode[] =>
            nodes.map((n) => {
              if (n.path === path) {
                return { ...n, children, loaded: true, expanded: true };
              }
              if (n.children) {
                return { ...n, children: loadAndExpand(n.children) };
              }
              return n;
            });

          setTree((prev) => loadAndExpand(prev));
          return;
        } catch {
          // Fall through to just toggle
        }
      }

      setTree((prev) => updateNodes(prev));
    },
    [tree, fetchDir],
  );

  // Open a file
  const openFile = useCallback(
    async (path: string) => {
      setFileLoading(true);
      try {
        const result = await apiFetch<{ content: string; path: string; size: number }>(
          makeFileUrl(props, path),
        );
        setViewingFile(result);
      } catch {
        setError("Failed to read file");
      } finally {
        setFileLoading(false);
      }
    },
    [endpointKey],
  );

  return (
    <div className="flex h-full flex-col bg-oma-bg-elevated">
      {/* Header — optional */}
      {!hideHeader && (
        <div className={cn("flex items-center justify-between border-b px-4 py-3", palette?.border ?? "border-oma-glass-border")}>
          <div className="flex items-center gap-2">
            {viewingFile ? (
              <button
                onClick={() => setViewingFile(null)}
                className="flex items-center gap-1.5 text-xs text-oma-text-muted transition-colors hover:text-oma-text"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            ) : (
              <>
                <FolderOpen className="h-4 w-4 text-oma-text-muted" />
                <span className="text-sm font-medium text-oma-text">Workspace</span>
              </>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-oma text-oma-text-muted transition-colors hover:bg-oma-bg-surface hover:text-oma-text"
              aria-label="Close file explorer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-oma-text-muted" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <AlertCircle className="h-5 w-5 text-oma-error" />
            <p className="text-xs text-oma-text-muted">{error}</p>
          </div>
        ) : viewingFile ? (
          <FileViewer file={viewingFile} loading={fileLoading} onBack={() => setViewingFile(null)} />
        ) : (
          <div className="py-1">
            {tree.map((node) => (
              <TreeEntry
                key={node.path}
                node={node}
                depth={0}
                onToggleDir={toggleDir}
                onOpenFile={openFile}
              />
            ))}
            {tree.length === 0 && (
              <p className="px-4 py-8 text-center text-xs text-oma-text-subtle">
                Workspace is empty
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TreeEntry — recursive tree node
// ---------------------------------------------------------------------------

function TreeEntry({
  node,
  depth,
  onToggleDir,
  onOpenFile,
}: {
  node: TreeNode;
  depth: number;
  onToggleDir: (path: string) => void;
  onOpenFile: (path: string) => void;
}) {
  const isDir = node.type === "dir";
  const paddingLeft = 12 + depth * 16;

  return (
    <>
      <button
        onClick={() => (isDir ? onToggleDir(node.path) : onOpenFile(node.path))}
        className={cn(
          "flex w-full items-center gap-2 py-1.5 pr-3 text-left text-xs transition-colors",
          "hover:bg-oma-bg-surface",
          isDir ? "text-oma-text" : "text-oma-text-muted hover:text-oma-text",
        )}
        style={{ paddingLeft }}
      >
        {isDir ? (
          <>
            <ChevronRight
              className={cn(
                "h-3 w-3 shrink-0 text-oma-text-subtle transition-transform duration-150",
                node.expanded && "rotate-90",
              )}
            />
            {node.expanded ? (
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-oma-gold" />
            ) : (
              <FolderClosed className="h-3.5 w-3.5 shrink-0 text-oma-gold" />
            )}
          </>
        ) : (
          <>
            <span className="w-3" />
            <File className="h-3.5 w-3.5 shrink-0 text-oma-text-subtle" />
          </>
        )}
        <span className="truncate font-mono">{node.name}</span>
      </button>

      {isDir && node.expanded && node.children && (
        <>
          {node.children.map((child) => (
            <TreeEntry
              key={child.path}
              node={child}
              depth={depth + 1}
              onToggleDir={onToggleDir}
              onOpenFile={onOpenFile}
            />
          ))}
          {node.loaded && node.children.length === 0 && (
            <div
              className="py-1.5 text-xs text-oma-text-subtle italic"
              style={{ paddingLeft: paddingLeft + 20 }}
            >
              empty
            </div>
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// FileViewer — displays file content
// ---------------------------------------------------------------------------

function FileViewer({
  file,
  loading,
  onBack,
}: {
  file: { path: string; content: string; size: number };
  loading: boolean;
  onBack?: () => void;
}) {
  const fileName = file.path.split("/").pop() ?? file.path;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-oma-text-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* File info bar */}
      <div className="flex items-center justify-between border-b border-oma-glass-border px-4 py-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-xs text-oma-text-muted transition-colors hover:text-oma-text"
            >
              <ArrowLeft className="h-3 w-3" />
            </button>
          )}
          <span className="truncate font-mono text-xs text-oma-text">{fileName}</span>
        </div>
        <span className="shrink-0 text-xs text-oma-text-subtle">
          {file.size < 1024
            ? `${file.size} B`
            : `${(file.size / 1024).toFixed(1)} KB`}
        </span>
      </div>

      {/* Content */}
      <pre className="overflow-x-auto whitespace-pre p-4 font-mono text-xs leading-relaxed text-oma-text-muted">
        {file.content}
      </pre>
    </div>
  );
}
