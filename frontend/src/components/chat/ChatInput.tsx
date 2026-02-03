import { useState, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { WorshipTemplates } from './WorshipTemplates';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
  showTemplates?: boolean;
}

export function ChatInput({ onSend, isLoading, placeholder, showTemplates = false }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTemplateSelect = (templateMessage: string) => {
    if (!isLoading) {
      onSend(templateMessage);
    }
  };

  return (
    <div
      className="border-t border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700"
      role="form"
      aria-label="채팅 입력"
    >
      {showTemplates && (
        <WorshipTemplates onSelect={handleTemplateSelect} disabled={isLoading} />
      )}
      <div className="p-3 sm:p-4">
        <div className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">
            예배 정보나 원하는 곡 스타일을 입력하세요
          </label>
          <textarea
            id="chat-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "예배 정보나 원하는 곡 스타일을 알려주세요..."}
            className={cn(
              'flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 px-3 sm:px-4 py-3',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'placeholder:text-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 text-base',
              'min-h-[48px] max-h-[120px]'
            )}
            rows={1}
            disabled={isLoading}
            aria-describedby="chat-input-hint"
            aria-busy={isLoading}
          />
          <button
            type="submit"
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
            className={cn(
              'px-4 py-3 rounded-lg font-medium',
              'bg-primary-600 text-white',
              'hover:bg-primary-700 active:bg-primary-800 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center',
              'min-w-[48px] min-h-[48px]',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
            )}
            aria-label={isLoading ? '메시지 전송 중...' : '메시지 전송'}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
        <p id="chat-input-hint" className="text-xs text-gray-500 dark:text-gray-400 mt-2 hidden sm:block">
          Enter로 전송 · Shift+Enter로 줄바꿈
        </p>
      </div>
    </div>
  );
}
