"use client";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { threadAPI, messageAPI } from "@/services/api";
import { useChatStore } from "@/store/slices/chatStore";
import { MessageInput } from "@/components/MessageInput";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { workspacesApi } from "@/lib/api/workspaces";
import { generationsApi } from "@/lib/api/generations";
import { invalidateWorkspaces, invalidateDashboard } from "@/lib/api/hooks";
import { modeToFramework, deriveInputMode, getErrorMessage } from "@/lib/utils";
import { toast } from "@/store/toastStore";

export const ChatPage = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const threadId =
    typeof params?.threadId === "string" ? params.threadId : undefined;
  const projectId = searchParams.get("projectId") ?? undefined;
  const {
    setCurrentThread,
    messages,
    setMessages,
    addMessage,
    isStreaming,
    startStream,
    resetStream,
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

  // Reset the chat store when entering the new chat page
  useEffect(() => {
    setCurrentThread(null);
    setMessages([]);
    resetStream();
  }, [setCurrentThread, setMessages, resetStream]);

  useEffect(() => {
    if (thread) setCurrentThread(thread);
  }, [thread, setCurrentThread]);

  useEffect(() => {
    if (fetchedMessages) setMessages(fetchedMessages);
  }, [fetchedMessages, setMessages]);

  const handleSendMessage = async (
    content: string,
    images: File[],
    mode: string,
    usePromptImprover: boolean,
  ) => {
    try {
      // New thread: create the thread first, then the workspace, then start the
      // stream. Sequenced (not Promise.all'd) so a failed thread creation never
      // leaves behind an orphaned, unused workspace.
      if (!threadId) {
        const res = await threadAPI.create({
          message: content,
          images,
          mode: mode as string,
          use_prompt_improver: usePromptImprover,
        });
        const workspace = await workspacesApi.create({
          name: content.slice(0, 60) || "New Chat",
          framework: modeToFramework(mode),
          projectId,
        });

        generationsApi
          .generate({
            workspaceId: workspace._id,
            prompt: content,
            framework: modeToFramework(mode),
            inputMode: deriveInputMode(images),
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
        if (res.thread.messages && res.thread.messages.length > 0) {
          setMessages(res.thread.messages);
        }
        startStream(res.thread.id, res.message_id, workspace._id);
        queryClient.invalidateQueries({ queryKey: ["threads"] });
        router.push(`/thread/${res.thread.id}`);
        return;
      }

      // Existing thread: create the message, then start the stream.
      const res = await messageAPI.create(threadId, {
        content,
        images,
        mode: mode as string,
        use_prompt_improver: usePromptImprover,
      });
      addMessage(res.user_message);
      addMessage(res.assistant_message);
      startStream(threadId, res.message_id);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error(getErrorMessage(error, "Failed to send message. Please try again."));
    }
  };

  const isFirstMessage = !threadId || messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        disabled={isStreaming}
        isFirstMessage={isFirstMessage}
      />
    </div>
  );
};

export default ChatPage;
