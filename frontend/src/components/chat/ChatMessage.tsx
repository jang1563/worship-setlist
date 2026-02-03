import { Bot, User, Music } from 'lucide-react';
import { cn } from '@/utils/cn';
import { MusicTermTooltip } from '@/components/common/MusicTermTooltip';
import type { ChatMessage as ChatMessageType, SetlistGenerateResponse } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
  onSetlistSelect?: (setlist: SetlistGenerateResponse) => void;
}

export function ChatMessage({ message, onSetlistSelect }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'chat-message flex gap-3 p-4',
        isUser ? 'flex-row-reverse' : ''
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary-100 dark:bg-primary-900' : 'bg-gray-100 dark:bg-gray-700'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        ) : (
          <Bot className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex-1 max-w-[80%]',
          isUser ? 'text-right' : ''
        )}
      >
        <div
          className={cn(
            'inline-block rounded-lg px-4 py-3 text-left',
            isUser
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Setlist card */}
        {message.setlist && (
          <div className="mt-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4 text-left">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Music className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              추천 송리스트
            </h4>
            <div className="space-y-2">
              {message.setlist.setlist.map((song, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-sm font-medium flex items-center justify-center">
                      {song.order}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{song.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{song.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <MusicTermTooltip term="key" position="left">
                      <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm font-mono cursor-help">
                        {song.key}
                      </span>
                    </MusicTermTooltip>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {Math.floor(song.duration_sec / 60)}:{(song.duration_sec % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">총 시간</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {Math.floor(message.setlist.total_duration_sec / 60)}분 {message.setlist.total_duration_sec % 60}초
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <MusicTermTooltip term="keyFlow" position="right">
                  <span className="text-gray-600 dark:text-gray-400 cursor-help">키 흐름</span>
                </MusicTermTooltip>
                <span
                  className={cn(
                    'font-medium',
                    message.setlist.key_flow_assessment === '자연스러움'
                      ? 'text-green-600 dark:text-green-400'
                      : message.setlist.key_flow_assessment === '괜찮음'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {message.setlist.key_flow_assessment}
                </span>
              </div>
            </div>
            {onSetlistSelect && (
              <button
                onClick={() => onSetlistSelect(message.setlist!)}
                className="mt-4 w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                이 송리스트 사용하기
              </button>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-1">
          {message.timestamp.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
