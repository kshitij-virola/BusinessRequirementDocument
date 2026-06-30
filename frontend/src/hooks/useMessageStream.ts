import { useCallback, useEffect, useRef } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { API_ENDPOINTS } from '../config/api';
import type { SSEStatusData, SSECompleteData, StageData } from '../types';

interface UseMessageStreamOptions {
  onConnected?: (data: { thread_id: string; message_id: string }) => void;
  onStatus?: (data: SSEStatusData) => void;
  onContent?: (text: string) => void;
  onStage?: (data: StageData) => void;
  onComplete?: (data: SSECompleteData) => void;
  onError?: (error: string) => void;
}

/**
 * Fetch-based SSE client.
 *
 * Native EventSource cannot send an Authorization header and the backend has no
 * query-param token auth, so we stream via fetch and forward the Bearer token.
 * `connect` takes explicit thread/message ids so it does not depend on the route
 * param (which is the bug that prevented the stream from ever firing).
 */
export const useMessageStream = (options: UseMessageStreamOptions) => {
  // Keep the latest callbacks without re-creating connect on every render.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const controllerRef = useRef<AbortController | null>(null);
  const doneRef = useRef(false);

  const disconnect = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  }, []);

  const connect = useCallback(
    (threadId: string, messageId: string) => {
      if (!threadId || !messageId) return;

      const token = localStorage.getItem('access_token');
      if (!token) {
        optionsRef.current.onError?.('No authentication token');
        return;
      }

      // Tear down any prior stream before starting a new one.
      disconnect();
      doneRef.current = false;

      const controller = new AbortController();
      controllerRef.current = controller;

      const url = API_ENDPOINTS.MESSAGES.STREAM(threadId, messageId);

      fetchEventSource(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          // The backend's DRF only configures a JSON renderer, so an
          // `Accept: text/event-stream` request fails content negotiation with
          // 406 before the view runs. `*/*` passes negotiation; the view still
          // returns a text/event-stream StreamingHttpResponse. (lowercase key so
          // @microsoft/fetch-event-source doesn't re-add its own Accept header.)
          accept: '*/*',
        },
        signal: controller.signal,
        openWhenHidden: true,

        async onopen(res) {
          const ct = res.headers.get('content-type') || '';
          if (res.ok && ct.includes('text/event-stream')) return;
          // 401 / 404 / 500 etc. come back as JSON, not a stream. Fatal.
          throw new Error(`Stream failed (HTTP ${res.status})`);
        },

        onmessage(ev) {
          if (!ev.event) return;
          let data: unknown = {};
          try {
            data = ev.data ? JSON.parse(ev.data) : {};
          } catch {
            data = {};
          }

          switch (ev.event) {
            case 'connected':
              optionsRef.current.onConnected?.(
                data as { thread_id: string; message_id: string }
              );
              break;
            case 'status':
              optionsRef.current.onStatus?.(data as SSEStatusData);
              break;
            case 'content':
              optionsRef.current.onContent?.((data as { text?: string }).text ?? '');
              break;
            case 'stage':
              optionsRef.current.onStage?.(data as StageData);
              break;
            case 'complete':
              doneRef.current = true;
              optionsRef.current.onComplete?.(data as SSECompleteData);
              disconnect();
              break;
            case 'error':
              doneRef.current = true;
              optionsRef.current.onError?.(
                (data as { message?: string }).message ?? 'Stream error'
              );
              disconnect();
              break;
            default:
              break;
          }
        },

        onclose() {
          // The backend restarts generation from scratch on reconnect, so we
          // never auto-retry. Throwing keeps fetch-event-source from reopening.
          if (doneRef.current) return;
          throw new Error('Stream closed');
        },

        onerror(err) {
          // Called for network errors and for the abort we trigger on complete.
          if (!doneRef.current) {
            optionsRef.current.onError?.(
              err instanceof Error ? err.message : 'Connection error'
            );
          }
          throw err; // rethrow => fatal => no auto-retry
        },
      }).catch(() => {
        // Terminal/abort errors are already surfaced via onError above.
      });
    },
    [disconnect]
  );

  // Safety net: abort the stream if the component unmounts mid-generation.
  useEffect(() => disconnect, [disconnect]);

  return { connect, disconnect };
};
