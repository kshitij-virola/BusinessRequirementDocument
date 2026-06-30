import { useEffect, useRef } from 'react';
import type { Message as MessageType, StreamStatus, StageData } from '../types';
import { MessageBubble } from './MessageBubble';
import { StageTimeline } from './StageTimeline';

interface MessageListProps {
  messages: MessageType[];
  pendingMessageId: string | null;
  streamStatus: StreamStatus;
  streamPhase: string;
  streamingContent: string;
  stages: StageData[];
  streamError: string | null;
  projectId: string | null;
}

export const MessageList = ({
  messages,
  pendingMessageId,
  streamStatus,
  streamPhase,
  streamingContent,
  stages,
  streamError,
  projectId,
}: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <div className="flex-1 overflow-y-auto bg-background px-3 sm:px-4 py-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((message) => {
          const isPending = message.id === pendingMessageId;
          const isLive = isPending && streamStatus === 'generating';
          const isFailed = isPending && streamStatus === 'error';

          // While generating, override the (empty) pending bubble with live text.
          const rendered = isLive
            ? { ...message, content: streamingContent, status: 'generating' as const }
            : isFailed
            ? { ...message, status: 'error' as const, error_message: streamError ?? message.error_message }
            : message;

          return (
            <div key={message.id} className="space-y-3">
              {isLive && stages.length > 0 && <StageTimeline stages={stages} />}
              <MessageBubble
                message={rendered}
                isStreaming={isLive}
                phase={isLive ? streamPhase : undefined}
                projectId={projectId}
              />
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
