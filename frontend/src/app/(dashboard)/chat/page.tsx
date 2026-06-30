'use client'
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { threadAPI, messageAPI } from '@/services/api';
import { useChatStore } from '@/store/slices/chatStore';
import { MessageList } from '@/components/MessageList';
import { MessageInput } from '@/components/MessageInput';
import { useParams, useRouter } from 'next/navigation';

export const ChatPage = () => {
  const router = useRouter();
  const params = useParams();
  const threadId = typeof params?.threadId === 'string' ? params.threadId : undefined;
  const queryClient = useQueryClient();
  const {
    currentThread,
    setCurrentThread,
    messages,
    setMessages,
    addMessage,
    pendingMessageId,
    isStreaming,
    streamStatus,
    streamPhase,
    streamingContent,
    stages,
    projectId,
    streamError,
    startStream,
    resetStream,
  } = useChatStore();

  // Fetch thread data when threadId changes
  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => threadAPI.get(threadId!),
    enabled: !!threadId,
  });

  // Fetch messages for the current thread. Poll ONLY while a stream is active
  // (fallback if SSE drops); never poll while idle.
  const { data: fetchedMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', threadId],
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
    usePromptImprover: boolean
  ) => {
    try {
      // New thread: create, then start the stream and update the URL cosmetically.
      if (!threadId) {
        const res = await threadAPI.create({
          message: content,
          images,
          mode: mode as 'website' | 'ui' | 'wordpress_divi_child' | 'reactjs' | 'angular' | 'vuejs',
          use_prompt_improver: usePromptImprover,
        });

        setCurrentThread(res.thread);
        if (res.thread.messages && res.thread.messages.length > 0) {
          setMessages(res.thread.messages);
        }
        startStream(res.thread.id, res.message_id);
        queryClient.invalidateQueries({ queryKey: ['threads'] });
        router.push(`/thread/${res.thread.id}`);
        return;
      }

      // Existing thread: create the message, then start the stream.
      const res = await messageAPI.create(threadId, {
        content,
        images,
        mode: mode as 'website' | 'ui' | 'wordpress_divi_child' | 'reactjs' | 'angular' | 'vuejs',
        use_prompt_improver: usePromptImprover,
      });
      addMessage(res.user_message);
      addMessage(res.assistant_message);
      startStream(threadId, res.message_id);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const isFirstMessage = !threadId || messages.length === 0;
  const downloadProjectId = currentThread?.project?.id ?? projectId;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background px-5 py-3.5 shrink-0">
        <h1 className="text-base font-semibold text-foreground truncate">
          {currentThread?.title || 'New Chat'}
        </h1>
        {currentThread?.project && (
          <p className="text-xs text-gray-500 mt-0.5">
            {currentThread.project.name}
          </p>
        )}
      </div>

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

