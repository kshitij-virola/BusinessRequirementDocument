"use client";
import { useState, useRef, useEffect } from "react";
import type { ProjectFile } from "@/types";
import { useParams, useRouter } from "next/navigation";
import { useChatStore } from "@/store/slices/chatStore";
import { MessageList } from "@/components/MessageList";
import { MessageInput } from "@/components/MessageInput";
import { useMessageStream } from "@/hooks/useMessageStream";
import { threadAPI, messageAPI, fileAPI, projectAPI } from "@/services/api";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  Code,
  Eye,
  Folder,
  FolderOpen,
  X,
} from "lucide-react";
import Link from "next/link";
import { cn, modeToFramework, deriveInputMode } from "@/lib/utils";
import { workspacesApi } from "@/lib/api/workspaces";
import { generationsApi } from "@/lib/api/generations";
import { invalidateWorkspaces, invalidateDashboard } from "@/lib/api/hooks";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  code?: string;
  language?: string;
  status?: "generating" | "done" | "error";
  credits?: number;
  timestamp?: string;
  suggestions?: string[];
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  ext?: string;
  path?: string;
  content?: string;
  fileType?: string;
}

function buildFileTree(files: ProjectFile[]): FileNode[] {
  const root: FileNode[] = [];
  const folderMap = new Map<string, FileNode>();
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sorted) {
    const parts = file.path.replace(/^\//, "").split("/");
    let siblings = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const key = parts.slice(0, i + 1).join("/");

      if (isFile) {
        const ext = part.includes(".") ? part.split(".").pop() : undefined;
        siblings.push({
          name: part,
          type: "file",
          ext,
          path: file.path,
          content: file.content,
          fileType: file.file_type,
        });
      } else {
        if (!folderMap.has(key)) {
          const folder: FileNode = {
            name: part,
            type: "folder",
            path: key,
            children: [],
          };
          folderMap.set(key, folder);
          siblings.push(folder);
        }
        siblings = folderMap.get(key)!.children!;
      }
    }
  }

  return root;
}

function getFileIconStyle(ext?: string): { bg: string; label: string } {
  const map: Record<string, { bg: string; label: string }> = {
    tsx: { bg: "bg-sky-500", label: "T" },
    ts: { bg: "bg-blue-500", label: "T" },
    js: { bg: "bg-yellow-500", label: "J" },
    css: { bg: "bg-blue-400", label: "C" },
    json: { bg: "bg-yellow-600", label: "{" },
    html: { bg: "bg-orange-500", label: "H" },
    md: { bg: "bg-muted", label: "M" },
    svg: { bg: "bg-purple-500", label: "S" },
    ico: { bg: "bg-indigo-400", label: "I" },
    lock: { bg: "bg-gray-600", label: "L" },
    ignore: { bg: "bg-gray-600", label: "G" },
    txt: { bg: "bg-muted", label: "T" },
  };
  return map[ext ?? ""] ?? { bg: "bg-gray-600", label: "F" };
}

function FileTreeNode({
  node,
  depth = 0,
  selectedFile,
  onSelect,
}: {
  node: FileNode;
  depth?: number;
  selectedFile: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const isSelected =
    node.type === "file" && selectedFile === (node.path ?? node.name);

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className="flex items-center gap-1.5 w-full py-[3px] pr-2 text-[13px] text-foreground/80 hover:bg-secondary rounded-sm transition-colors"
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 text-muted shrink-0 transition-transform duration-100",
              open && "rotate-90",
            )}
          />
          {open ? (
            <FolderOpen className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
          )}
          <span>{node.name}</span>
        </button>
        {open &&
          node.children?.map((child) => (
            <FileTreeNode
              key={child.path ?? child.name}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelect={onSelect}
            />
          ))}
      </div>
    );
  }

  const { bg, label } = getFileIconStyle(node.ext);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isSelected)
      btnRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [isSelected]);

  return (
    <button
      ref={btnRef}
      onClick={() => onSelect(node.path ?? node.name)}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
      className={cn(
        "relative flex items-center gap-1.5 w-full py-[4px] pr-2 text-[13px] transition-colors",
        isSelected
          ? "bg-primary/20 text-primary font-medium"
          : "text-foreground/75 hover:bg-secondary hover:text-foreground",
      )}
    >
      {isSelected && (
        <span className="absolute left-0 inset-y-0 w-[2px] bg-primary rounded-r-full" />
      )}
      <span
        className={cn(
          "inline-flex items-center justify-center w-3.5 h-3.5 rounded-[2px] text-[7px] font-bold text-white shrink-0",
          bg,
        )}
      >
        {label}
      </span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

function buildPreviewHtml(
  htmlContent: string,
  contentMap: Map<string, string>,
): string {
  const norm = (p: string) => p.replace(/^[./]+/, "");

  const inlineCss = (match: string, href: string) => {
    const content = contentMap.get(norm(href));
    return content ? `<style>\n${content}\n</style>` : match;
  };

  let html = htmlContent
    .replace(
      /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*\/?>/gi,
      inlineCss,
    )
    .replace(
      /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']stylesheet["'][^>]*\/?>/gi,
      inlineCss,
    );

  html = html.replace(
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi,
    (match, src) => {
      const content = contentMap.get(norm(src));
      return content ? `<script>\n${content}\n</script>` : match;
    },
  );

  return html;
}

type ViewMode = "code" | "preview";

export const ChatPage = () => {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const closedTabsRef = useRef<Set<string>>(new Set());
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("code");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const threadId = typeof params?.slug === "string" ? params.slug : undefined;

  const handleSelectFile = (path: string) => {
    setSelectedFile(path);
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
  };

  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    closedTabsRef.current.add(path);
    setOpenTabs((prev) => {
      const idx = prev.indexOf(path);
      const next = prev.filter((p) => p !== path);
      if (selectedFile === path)
        setSelectedFile(next[idx] ?? next[idx - 1] ?? null);
      return next;
    });
  };

  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ["files", threadId],
    queryFn: () => fileAPI.list(threadId!, 1, 100),
    enabled: !!threadId,
  });

  const allFiles = filesData?.results ?? [];

  const { data: selectedFileData, isLoading: selectedFileLoading } = useQuery({
    queryKey: ["file", threadId, selectedFile],
    queryFn: () => fileAPI.get(threadId!, selectedFile!),
    enabled: !!threadId && !!selectedFile,
  });

  // Always preview the main HTML file (index.html first, then any .html)
  const previewTargetPath =
    (
      allFiles.find((f) => /\/index\.html?$/i.test(f.path)) ??
      allFiles.find((f) => /\.html?$/i.test(f.path))
    )?.path ?? null;

  // Fetch the preview HTML file (React Query deduplicates if same as selectedFile)
  const { data: previewHtmlFile, isLoading: previewHtmlLoading } = useQuery({
    queryKey: ["file", threadId, previewTargetPath],
    queryFn: () => fileAPI.get(threadId!, previewTargetPath!),
    enabled: !!threadId && !!previewTargetPath && viewMode === "preview",
  });

  // Fetch all CSS/JS files when in preview mode so they can be inlined
  const cssJsPaths = allFiles
    .filter((f) => /\.(css|js)$/i.test(f.path))
    .map((f) => f.path);

  const depResults = useQueries({
    queries: cssJsPaths.map((path) => ({
      queryKey: ["file", threadId, path],
      queryFn: () => fileAPI.get(threadId!, path),
      enabled: !!threadId && viewMode === "preview",
    })),
  });

  const depContentMap = new Map<string, string>();
  depResults.forEach((r, i) => {
    if (r.data?.content)
      depContentMap.set(cssJsPaths[i].replace(/^[./]+/, ""), r.data.content);
  });

  const previewHtml = previewHtmlFile?.content
    ? buildPreviewHtml(previewHtmlFile.content, depContentMap)
    : null;

  const previewLoading =
    viewMode === "preview" &&
    (previewHtmlLoading || depResults.some((r) => r.isLoading));

  // Used by the Download button — resolved before panel JSX is defined
  const downloadProjectId = useChatStore(
    (s) => s.currentThread?.project?.id ?? s.projectId ?? null,
  );

  useEffect(() => {
    if (!filesData?.results.length) return;
    setOpenTabs((prev) => {
      const existing = new Set(prev);
      const toAdd = filesData.results
        .map((f) => f.path)
        .filter((p) => !existing.has(p) && !closedTabsRef.current.has(p));
      return toAdd.length ? [...prev, ...toAdd] : prev;
    });
    setSelectedFile((prev) => prev ?? filesData.results[0].path);
  }, [filesData]);

  const totalFiles = allFiles.length;
  const realFileTree = allFiles.length ? buildFileTree(allFiles) : [];
  const {
    currentThread,
    setCurrentThread,
    messages,
    setMessages,
    addMessage,
    updateMessage,
    activeThreadId,
    pendingMessageId,
    isStreaming,
    streamStatus,
    streamPhase,
    streamingContent,
    stages,
    projectId,
    streamError,
    startStream,
    setStreamPhase,
    applyStage,
    appendStreamingContent,
    completeStream,
    failStream,
    setPendingGenerationId,
  } = useChatStore();

  // Fetch thread data when threadId changes
  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => threadAPI.get(threadId!),
    enabled: !!threadId,
  });

  // Fetch messages for the current thread. Poll ONLY while a stream is active
  // (fallback if SSE drops); never poll while idle.
  const { data: fetchedMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: () => messageAPI.list(threadId!),
    enabled: !!threadId,
    refetchInterval: isStreaming ? 4000 : false,
  });

  // Fetch project files for the file tree panel.
  useEffect(() => {
    if (thread) setCurrentThread(thread);
  }, [thread, setCurrentThread]);

  useEffect(() => {
    if (fetchedMessages) setMessages(fetchedMessages);
  }, [fetchedMessages, setMessages]);

  // SSE client. Callbacks read fresh state via getState() to avoid stale closures.
  const { connect, disconnect } = useMessageStream({
    onStatus: (data) => setStreamPhase(data.phase ?? data.status ?? ""),
    onContent: (text) => appendStreamingContent(text),
    onStage: (data) => applyStage(data),
    onComplete: (data) => {
      const state = useChatStore.getState();
      const tid = state.activeThreadId;
      if (state.pendingMessageId)
        updateMessage(state.pendingMessageId, {
          content: state.streamingContent,
          status: "completed",
        });
      completeStream({ projectId: data.project_id ?? null });
      if (state.pendingGenerationId) {
        generationsApi
          .complete(state.pendingGenerationId, {
            status: "completed",
            projectId: data.project_id,
            filesCount: data.files_count,
          })
          .catch(console.error)
          .finally(() => setPendingGenerationId(null));
      }
      queryClient.invalidateQueries({ queryKey: ["messages", tid] });
      queryClient.invalidateQueries({ queryKey: ["thread", tid] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
    onError: (error) => {
      const state = useChatStore.getState();
      if (state.pendingMessageId)
        updateMessage(state.pendingMessageId, { status: "error", error_message: error });
      if (state.pendingGenerationId) {
        generationsApi
          .complete(state.pendingGenerationId, { status: "failed", errorMessage: error })
          .catch(console.error)
          .finally(() => setPendingGenerationId(null));
      }
      failStream(error);
    },
  });

  // Connect to the stream as soon as a session is started — independent of the
  // route param. This is what makes the stream fire immediately after create.
  useEffect(() => {
    if (activeThreadId && pendingMessageId && streamStatus === "generating")
      connect(activeThreadId, pendingMessageId);
    return () => disconnect();
  }, [activeThreadId, pendingMessageId, streamStatus, connect, disconnect]);

  const handleSendMessage = async (
    content: string,
    images: File[],
    mode: string,
    usePromptImprover: boolean,
  ) => {
    const framework = modeToFramework(mode);
    const inputMode = deriveInputMode(images);

    try {
      // New thread: create workspace + generation record in parallel with thread creation.
      if (!threadId) {
        const [res, workspace] = await Promise.all([
          threadAPI.create({
            message: content,
            images,
            mode: mode as string,
            use_prompt_improver: usePromptImprover,
          }),
          workspacesApi.create({
            name: content.slice(0, 60) || "New Chat",
            framework,
          }),
        ]);

        generationsApi
          .generate({
            workspaceId: workspace._id,
            prompt: content,
            framework,
            inputMode,
            images,
            threadId: res.thread.id,
            projectId: res.thread.project?.id,
          })
          .then((genResult) => {
            setPendingGenerationId(genResult.generationId);
            return Promise.all([invalidateWorkspaces(), invalidateDashboard()]);
          })
          .catch(console.error);

        setCurrentThread(res.thread);
        if (res.thread.messages && res.thread.messages.length > 0)
          setMessages(res.thread.messages);
        startStream(res.thread.id, res.message_id);
        queryClient.invalidateQueries({ queryKey: ["threads"] });
        router.push(`/thread/${res.thread.id}`);
        return;
      }

      // Existing thread: create message and generation record in parallel.
      const [res, workspace] = await Promise.all([
        messageAPI.create(threadId, {
          content,
          images,
          mode: mode as string, //'website' | 'ui' | 'wordpress_divi_child' | 'reactjs' | 'angular' | 'vuejs',
          use_prompt_improver: usePromptImprover,
        }),
        workspacesApi.create({
          name: content.slice(0, 60) || "Follow-up",
          framework,
        }),
      ]);

      generationsApi
        .generate({
          workspaceId: workspace._id,
          prompt: content,
          framework,
          inputMode,
          images,
          threadId,
          projectId: currentThread?.project?.id ?? projectId ?? undefined,
        })
        .then((genResult) => {
          setPendingGenerationId(genResult.generationId);
          return Promise.all([invalidateWorkspaces(), invalidateDashboard()]);
        })
        .catch(console.error);

      addMessage(res.user_message);
      addMessage(res.assistant_message);
      startStream(threadId, res.message_id);
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const isFirstMessage = !threadId || messages.length === 0;

  // ── File tree panel ──────────────────────────────────────────────────────────
  const fileTreePanel = (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted/60 select-none">
          Explorer
        </span>
        {!filesLoading && totalFiles > 0 && (
          <span className="text-[10px] bg-secondary text-muted px-1.5 py-0.5 rounded-full border border-border leading-none">
            {totalFiles}
          </span>
        )}
      </div>
      {/* Search */}
      <div className="px-2.5 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 rounded-md bg-secondary/60 border border-border/60 px-2 py-1.5 focus-within:border-primary/40 transition-colors">
          <Search className="h-3 w-3 text-muted/60 shrink-0" />
          <input
            type="text"
            placeholder="Search files…"
            className="flex-1 bg-transparent text-[12px] text-foreground/80 placeholder:text-muted/50 focus:outline-none min-w-0"
          />
        </div>
      </div>
      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1 px-1">
        {filesLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-[11px] text-muted/50">Loading files…</span>
          </div>
        ) : realFileTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-10 px-4 text-center">
            <Folder className="h-6 w-6 text-muted/30" />
            <p className="text-[12px] text-muted/60">No files yet.</p>
            <p className="text-[11px] text-muted/40">
              Files will appear here once generation starts.
            </p>
          </div>
        ) : (
          realFileTree.map((node) => (
            <FileTreeNode
              key={node.path ?? node.name}
              node={node}
              selectedFile={selectedFile}
              onSelect={handleSelectFile}
            />
          ))
        )}
      </div>
    </div>
  );

  // ── Code panel ───────────────────────────────────────────────────────────────
  const codePanel = (
    <div className="flex flex-col h-full bg-background">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border shrink-0 bg-background">
        {/* Scrollable tab list — hidden in preview mode */}
        {viewMode === "code" && (
          <div className="flex items-end flex-1 min-w-0 overflow-x-auto scrollbar-none">
            {/* Mobile back button */}
            <button
              type="button"
              className="flex items-center gap-1 px-3 py-2.5 text-xs text-muted hover:text-foreground hover:bg-secondary transition-colors shrink-0 lg:hidden border-r border-border self-stretch"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Chat
            </button>
            {openTabs.length === 0 ? (
              <span className="px-4 py-2.5 text-[11px] text-muted/40 italic select-none">
                No files open
              </span>
            ) : (
              openTabs.map((path) => {
                const label = path.replace(/^\//, "");
                const fileName = label.split("/").pop() ?? label;
                const ext = fileName.includes(".")
                  ? fileName.split(".").pop()
                  : undefined;
                const { bg } = getFileIconStyle(ext);
                const isActive = selectedFile === path;
                return (
                  <button
                    key={path}
                    onClick={() => setSelectedFile(path)}
                    className={cn(
                      "group relative flex items-center gap-1.5 px-3 py-2.5 text-[12px] shrink-0 border-b-2 transition-all whitespace-nowrap",
                      isActive
                        ? "border-primary text-foreground bg-secondary/70"
                        : "border-transparent text-muted/70 hover:text-foreground hover:bg-secondary/40",
                    )}
                    title={label}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-[2px] shrink-0 opacity-80",
                        bg,
                      )}
                    />
                    <span>{fileName}</span>
                    <span
                      role="button"
                      onClick={(e) => handleCloseTab(path, e)}
                      className={cn(
                        "flex items-center justify-center w-3.5 h-3.5 rounded transition-all",
                        isActive
                          ? "opacity-60 hover:opacity-100 hover:bg-muted/30"
                          : "opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-muted/30",
                      )}
                    >
                      <X className="h-2.5 w-2.5" />
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
        {viewMode === "preview" && (
          <div className="flex-1 px-3 py-2 min-w-0">
            <span className="text-[12px] text-muted/60 truncate">
              {previewTargetPath?.replace(/^\//, "") ?? "Preview"}
            </span>
          </div>
        )}
        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2 pr-3 py-2 border-l border-border self-stretch">
          <div className="flex rounded-lg border border-border p-0.5">
            {(["code", "preview"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors capitalize",
                  viewMode === mode
                    ? "bg-primary text-white"
                    : "text-muted hover:text-foreground",
                )}
              >
                {mode === "code" ? (
                  <Code className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
                {mode}
              </button>
            ))}
          </div>
          <button
            className="flex items-center gap-1 text-[11px] text-muted hover:text-foreground transition-colors whitespace-nowrap px-1.5 py-1 rounded-md hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!downloadProjectId}
            onClick={async () => {
              if (!downloadProjectId) return;
              const blob = await projectAPI.download(downloadProjectId);
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${currentThread?.title ?? "project"}.zip`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>

      {/* Breadcrumb — hidden in preview mode */}
      {viewMode === "code" && selectedFile && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/60 bg-secondary/20 shrink-0 overflow-x-auto scrollbar-none">
          {selectedFile
            .replace(/^\//, "")
            .split("/")
            .map((segment, i, arr) => (
              <span key={i} className="flex items-center gap-1 shrink-0">
                {i > 0 && (
                  <ChevronRight className="h-2.5 w-2.5 text-muted/40 shrink-0" />
                )}
                <span
                  className={cn(
                    "text-[11px]",
                    i === arr.length - 1
                      ? "text-foreground/80 font-medium"
                      : "text-muted/60",
                  )}
                >
                  {segment}
                </span>
              </span>
            ))}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {viewMode === "code" ? (
          selectedFileLoading ? (
            <div className="flex items-center justify-center h-full">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            (() => {
              const displayCode = selectedFileData?.content ?? "";
              const displayLang = selectedFileData?.file_type ?? "";
              return displayCode ? (
                <SyntaxHighlighter
                  language={displayLang}
                  style={atomOneDark}
                  customStyle={{
                    background: "transparent",
                    padding: "1rem",
                    fontSize: "12px",
                    margin: 0,
                  }}
                  showLineNumbers
                  lineNumberStyle={{ color: "var(--muted)", minWidth: "2.5em" }}
                >
                  {displayCode}
                </SyntaxHighlighter>
              ) : (
                <p className="p-4 text-sm text-muted/70">
                  No code generated yet.
                </p>
              );
            })()
          )
        ) : previewLoading ? (
          <div className="flex h-full items-center justify-center">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : previewHtml ? (
          <iframe
            key={previewTargetPath ?? "preview"}
            srcDoc={previewHtml}
            title="Preview"
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
            <Eye className="h-10 w-10 text-muted/25" />
            <div>
              <p className="text-sm font-medium text-muted/70">
                No HTML file to preview
              </p>
              <p className="text-xs text-muted/45 mt-1">
                Select an <span className="font-mono">.html</span> file from the
                explorer, or wait for generation to produce one.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="hidden lg:flex h-full">
        <div className={cn(
          "flex flex-col shrink-0",
          isStreaming
            ? "flex-1"
            : "w-[380px] min-w-[260px] border-r border-border"
        )}>
          <div className="border-b border-border bg-background px-5 py-3.5 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-full truncate">
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    href="/workspaces"
                    className="text-muted hover:text-foreground shrink-0 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                  <h1 className="text-base font-semibold text-foreground truncate">
                    {currentThread?.title || "New Chat"}
                  </h1>
                </div>
                {currentThread?.project && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {currentThread.project.name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-secondary hover:text-foreground transition-colors lg:hidden"
                >
                  <Code className="h-3.5 w-3.5" />
                  <span>Code</span>
                </button>
                {/* <VersionHistoryButton workspaceId={(params?.slug as string) || ""}/> */}
                {/* <WorkspaceActionsMenu workspaceId={(params?.slug as string) || ""} name="SaaS Dashboard Theme" status="active" /> */}
              </div>
            </div>
          </div>

          {/* Messages */}
          {threadLoading || messagesLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <MessageList
              messages={messages}
              pendingMessageId={pendingMessageId}
              streamStatus={streamStatus}
              streamPhase={streamPhase}
              streamingContent={streamingContent}
              stages={stages}
              streamError={streamError}
              projectId={downloadProjectId}
            />
          )}

          {/* Input */}
          <MessageInput
            onSend={handleSendMessage}
            disabled={isStreaming}
            isFirstMessage={isFirstMessage}
            hideSuggestion
          />
        </div>
        {!isStreaming && viewMode === "code" && (
          <div className="w-[260px] min-w-[180px] border-r border-border flex flex-col shrink-0">
            {fileTreePanel}
          </div>
        )}
        {!isStreaming && (
          <div className="flex-1 flex flex-col min-w-0">{codePanel}</div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
