import { create } from 'zustand';
import type { Thread, Message, StreamStatus, StageData } from '../../types';

interface ChatState {
  currentThread: Thread | null;
  messages: Message[];

  // Streaming session (decoupled from the route param)
  activeThreadId: string | null;
  // Local-backend workspace backing the active thread — set once when the
  // thread/workspace pair is created so follow-up messages reuse it instead
  // of creating a new workspace per message.
  activeWorkspaceId: string | null;
  pendingMessageId: string | null;
  pendingGenerationId: string | null;
  streamStatus: StreamStatus;
  streamPhase: string;
  streamingContent: string;
  // Live per-agent progress from the Studio engine (empty for the serial path).
  stages: StageData[];
  projectId: string | null;
  streamError: string | null;
  // Invariant maintained by the actions: isStreaming === (streamStatus === 'generating')
  isStreaming: boolean;

  setCurrentThread: (thread: Thread | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;

  setPendingGenerationId: (id: string | null) => void;
  startStream: (threadId: string, messageId: string, workspaceId?: string) => void;
  setStreamPhase: (phase: string) => void;
  applyStage: (stage: StageData) => void;
  appendStreamingContent: (content: string) => void;
  completeStream: (data: { projectId?: string | null }) => void;
  failStream: (message: string) => void;
  resetStream: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  currentThread: null,
  messages: [],

  activeThreadId: null,
  activeWorkspaceId: null,
  pendingMessageId: null,
  pendingGenerationId: null,
  streamStatus: 'idle',
  streamPhase: '',
  streamingContent: '',
  stages: [],
  projectId: null,
  streamError: null,
  isStreaming: false,

  setPendingGenerationId: (id) => set({ pendingGenerationId: id }),
  setCurrentThread: (thread) => set({ currentThread: thread }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    })),

  startStream: (threadId, messageId, workspaceId) =>
    set((state) => ({
      activeThreadId: threadId,
      activeWorkspaceId: workspaceId ?? state.activeWorkspaceId,
      pendingMessageId: messageId,
      streamStatus: 'generating',
      streamPhase: 'init',
      streamingContent: '',
      stages: [],
      projectId: null,
      streamError: null,
      isStreaming: true,
    })),
  setStreamPhase: (phase) => set({ streamPhase: phase }),
  applyStage: (stage) =>
    set((state) => {
      // Upsert by index so a re-run (fix loop) updates the same row in place.
      const others = state.stages.filter((s) => s.index !== stage.index);
      return {
        stages: [...others, stage].sort((a, b) => a.index - b.index),
      };
    }),
  appendStreamingContent: (content) =>
    set((state) => ({ streamingContent: state.streamingContent + content })),
  completeStream: ({ projectId }) =>
    set((state) => ({
      streamStatus: 'completed',
      isStreaming: false,
      projectId: projectId ?? state.projectId,
    })),
  failStream: (message) =>
    set({ streamStatus: 'error', isStreaming: false, streamError: message }),
  resetStream: () =>
    set({
      activeThreadId: null,
      activeWorkspaceId: null,
      pendingMessageId: null,
      pendingGenerationId: null,
      streamStatus: 'idle',
      streamPhase: '',
      streamingContent: '',
      stages: [],
      projectId: null,
      streamError: null,
      isStreaming: false,
    }),
}));
