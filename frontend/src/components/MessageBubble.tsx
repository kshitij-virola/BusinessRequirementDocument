import type { Message } from '../types';
import { cn } from '@/lib/utils';
import { projectAPI } from '../services/api';
import { Download } from 'lucide-react';
import { toast } from '@/store/toastStore';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  phase?: string;
  projectId?: string | null;
}

export const MessageBubble = ({ message, isStreaming, phase, projectId }: MessageBubbleProps) => {
  const isUser = message.type === 'human';
  const isAI = message.type === 'ai';

  const handleDownload = async () => {
    if (!projectId) return;
    try {
      const blob = await projectAPI.download(projectId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `theme-${projectId}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download project:', error);
      toast.error('Failed to download. Please try again.');
    }
  };

  return (
    <div
      className={cn('flex gap-3', {
        'justify-end': isUser,
        'justify-start': isAI,
      })}
    >
      {isAI && (
        <div className="h-7 w-7 shrink-0 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
          AI
        </div>
      )}

      <div
        className={cn('max-w-[85%] rounded-2xl px-4 py-2.5 text-sm', {
          'bg-primary text-white rounded-br-sm': isUser,
          'bg-secondary text-gray-200 rounded-bl-sm': isAI,
        })}
      >
        {/* Message Content */}
        <div className="whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
          {isStreaming && (
            <span className="inline-flex w-1.5 h-4 ml-1 bg-current animate-pulse rounded-sm" />
          )}
        </div>

        {/* Image Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {message.attachments.map((attachment) => (
              <div key={attachment.id} className="rounded-xl overflow-hidden">
                <img
                  src={attachment.thumbnails?.['300'] || attachment.url}
                  alt={attachment.original_filename}
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Generating indicator */}
        {message.status === 'generating' && (
          <div className="mt-2 flex items-center gap-2 opacity-70">
            <span className="inline-flex gap-1">
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </span>
            <span className="text-xs font-medium">
              {phase !== 'generating' ? phase : 'Generating...'}
            </span>
          </div>
        )}

        {/* Error Message */}
        {message.status === 'error' && message.error_message && (
          <div className="mt-2 text-sm bg-red-500/10 text-red-400 px-3 py-2 rounded-lg border border-red-500/20">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs leading-relaxed">{message.error_message}</span>
            </div>
          </div>
        )}

        {/* Files Changed */}
        {message.files_changed && message.files_changed.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-white/10">
            <div className="flex items-center gap-2 mb-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-semibold opacity-80">
                {message.files_changed.length} file{message.files_changed.length !== 1 ? 's' : ''} modified
              </span>
            </div>
            <div className="space-y-1">
              {message.files_changed.slice(0, 3).map((file, idx) => (
                <div key={idx} className="text-xs font-mono px-2 py-1 rounded bg-black/20 opacity-80">
                  {file}
                </div>
              ))}
              {message.files_changed.length > 3 && (
                <div className="text-xs opacity-60 pt-0.5">
                  + {message.files_changed.length - 3} more files
                </div>
              )}
            </div>
          </div>
        )}

        {/* Download action */}
        {isAI && message.status === 'completed' && projectId && (
          <div className="mt-3">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download theme
            </button>
          </div>
        )}

        {/* Timestamp */}
        <div className="mt-1.5 text-xs opacity-50">
          {new Date(message.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
        </div>
      </div>

      {isUser && (
        <div className="h-7 w-7 shrink-0 rounded-full bg-secondary flex items-center justify-center text-foreground text-xs font-bold">
          U
        </div>
      )}
    </div>
  );
};
