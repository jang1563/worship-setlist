import { useRef, useEffect, useState, useCallback } from 'react';
import { MessageSquare, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { useChatStore } from '@/stores/chatStore';
import { aiApi } from '@/services/api';
import type { SetlistGenerateResponse } from '@/types';
import { getErrorInfo, type ErrorInfo } from '@/utils/errorMessages';

interface ChatViewProps {
  onSetlistSelect?: (setlist: SetlistGenerateResponse) => void;
}

export function ChatView({ onSetlistSelect }: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, addMessage, setLoading, setCurrentSetlist } = useChatStore();
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 재시도 카운트다운
  useEffect(() => {
    if (retryCountdown <= 0) return;
    const timer = setInterval(() => {
      setRetryCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [retryCountdown]);

  const handleSend = useCallback(async (content: string) => {
    addMessage({ role: 'user', content });
    setLoading(true);
    setErrorInfo(null);
    setLastFailedMessage(null);
    setRetryCountdown(0);

    try {
      const { currentSetlist } = useChatStore.getState();
      const chatMessages = [...messages, { role: 'user', content }].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Send current setlist as context for modification requests
      const context = currentSetlist ? { currentSetlist } : undefined;
      const response = await aiApi.chat(chatMessages, context);

      addMessage({
        role: 'assistant',
        content: response.message,
        setlist: response.setlist || undefined,
      });

      if (response.setlist) {
        setCurrentSetlist(response.setlist);
      }
    } catch (err) {
      console.error('Chat error:', err);
      const info = getErrorInfo(err, 'ai-chat');
      setErrorInfo(info);
      setLastFailedMessage(content);

      // 재시도 대기 시간이 있으면 카운트다운 시작
      if (info.retryDelay) {
        setRetryCountdown(info.retryDelay);
      }

      // 에러 메시지를 채팅에 표시
      const displayMessage = info.suggestion
        ? `${info.message} ${info.suggestion}`
        : info.message;
      addMessage({
        role: 'assistant',
        content: displayMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [messages, addMessage, setLoading, setCurrentSetlist]);

  const handleRetry = useCallback(() => {
    if (lastFailedMessage && retryCountdown === 0) {
      setErrorInfo(null);
      handleSend(lastFailedMessage);
    }
  }, [lastFailedMessage, retryCountdown, handleSend]);

  const handleSetlistSelect = (setlist: SetlistGenerateResponse) => {
    setCurrentSetlist(setlist);
    onSetlistSelect?.(setlist);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-8">
            <div className="bg-primary-100 dark:bg-primary-900/30 p-3 sm:p-4 rounded-full mb-3 sm:mb-4">
              <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
              AI 찬양 컨설턴트
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md mb-4 sm:mb-6 px-2">
              예배 정보를 알려주시면 맞춤 송리스트를 추천해드립니다.
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 max-w-md w-full text-left mx-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">예시:</p>
              <ul className="space-y-2 text-sm">
                <li className="p-3 sm:p-2 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 active:bg-gray-200 dark:active:bg-gray-500 transition-colors min-h-[44px] flex items-center text-gray-900 dark:text-gray-100"
                    onClick={() => handleSend("이번 주일 청년예배 25분, 설교 주제는 '성령의 인도하심'이야")}>
                  "이번 주일 청년예배 25분, 설교 주제는 '성령의 인도하심'이야"
                </li>
                <li className="p-3 sm:p-2 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 active:bg-gray-200 dark:active:bg-gray-500 transition-colors min-h-[44px] flex items-center text-gray-900 dark:text-gray-100"
                    onClick={() => handleSend("새벽예배용 잔잔한 찬양 3곡 추천해줘")}>
                  "새벽예배용 잔잔한 찬양 3곡 추천해줘"
                </li>
                <li className="p-3 sm:p-2 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 active:bg-gray-200 dark:active:bg-gray-500 transition-colors min-h-[44px] flex items-center text-gray-900 dark:text-gray-100"
                    onClick={() => handleSend("수련회 마지막 날 밤 헌신예배 30분 구성해줘")}>
                  "수련회 마지막 날 밤 헌신예배 30분 구성해줘"
                </li>
              </ul>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 sm:mt-6 max-w-md px-4">
              이 추천은 참고용입니다. 예배의 최종 결정은 성령의 인도하심과 인도자의 분별을 통해 이루어집니다.
            </p>
          </div>
        ) : (
          <div className="py-2 sm:py-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onSetlistSelect={handleSetlistSelect}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error with retry button */}
      {errorInfo && lastFailedMessage && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{errorInfo.title}</p>
                <p className="text-sm opacity-90">{errorInfo.message}</p>
                {errorInfo.suggestion && (
                  <p className="text-xs mt-1 opacity-75">{errorInfo.suggestion}</p>
                )}
              </div>
            </div>
            {errorInfo.retryable && (
              <div className="flex items-center justify-end gap-2">
                {retryCountdown > 0 ? (
                  <span className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                    <Clock className="w-3 h-3" />
                    {retryCountdown}초 후 재시도 가능
                  </span>
                ) : (
                  <button
                    onClick={handleRetry}
                    disabled={isLoading}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    다시 시도
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input area - fixed at bottom on mobile with safe area padding */}
      <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 pb-safe">
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          showTemplates={messages.length === 0}
        />
      </div>
    </div>
  );
}
