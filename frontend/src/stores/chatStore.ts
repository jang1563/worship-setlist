import { create } from 'zustand';
import type { ChatMessage, SetlistGenerateResponse } from '@/types';

interface ChatState {
  messages: ChatMessage[];
  currentSetlist: SetlistGenerateResponse | null;
  isLoading: boolean;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setCurrentSetlist: (setlist: SetlistGenerateResponse | null) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  currentSetlist: null,
  isLoading: false,

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      ],
    })),

  setCurrentSetlist: (setlist) =>
    set({ currentSetlist: setlist }),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  clearMessages: () =>
    set({ messages: [], currentSetlist: null }),
}));
