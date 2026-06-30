
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { threadAPI } from '../services/api';
import { useChatStore } from '../store/slices/chatStore';
import type { Thread } from '../types';
import { useRouter } from 'next/navigation';

export const Sidebar = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentThread, setCurrentThread, isStreaming, resetStream } = useChatStore();

  const { data: threadsData, isLoading } = useQuery({
    queryKey: ['threads'],
    queryFn: () => threadAPI.list(1),
    refetchInterval: isStreaming ? 5000 : false,
  });

  const threads = threadsData?.results || [];

  const handleNewThread = async () => {
    resetStream();
    setCurrentThread(null);
    router.push('/');
  };

  const handleSelectThread = (thread: Thread) => {
    resetStream();
    setCurrentThread(thread);
    router.push(`/thread/${thread.id}`);
  };

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;

    try {
      await threadAPI.delete(threadId);
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      if (currentThread?.id === threadId) {
        setCurrentThread(null);
        router.replace('/');
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  };

  return (
    <div className="hidden w-72 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white flex flex-col h-screen border-r border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800/50">
        <button
          onClick={handleNewThread}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>New Chat</span>
        </button>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="spinner border-indigo-500"></div>
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm font-medium">No conversations yet</p>
            <p className="text-gray-500 text-xs mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
              Recent Chats
            </div>
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => handleSelectThread(thread)}
                className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                  currentThread?.id === thread.id
                    ? 'bg-gradient-to-r from-indigo-600/20 to-indigo-500/10 border border-indigo-500/30'
                    : 'hover:bg-gray-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <div className="text-sm font-medium truncate text-gray-200 group-hover:text-white">
                        {thread.title || 'Untitled Chat'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(thread.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteThread(thread.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-md transition-all duration-200 flex-shrink-0"
                    title="Delete conversation"
                  >
                    <svg className="w-4 h-4 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
