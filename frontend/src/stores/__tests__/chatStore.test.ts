import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatStore } from '../chatStore';
import type { SetlistGenerateResponse } from '@/types';

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
});

// Helper to create a valid mock setlist
const createMockSetlist = (overrides = {}): SetlistGenerateResponse => ({
  setlist: [
    {
      song_id: 1,
      order: 1,
      title: 'Test Song',
      key: 'G',
      role: 'opening',
      duration_sec: 300,
    },
  ],
  total_duration_sec: 300,
  key_flow_assessment: 'Good flow',
  mood_flow: 'Energetic to peaceful',
  notes: 'Test notes',
  ...overrides,
});

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      messages: [],
      currentSetlist: null,
      isLoading: false,
    });
  });

  describe('addMessage', () => {
    it('should add a user message', () => {
      const store = useChatStore.getState();
      store.addMessage({
        role: 'user',
        content: 'Hello, I need help with worship songs',
      });

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].role).toBe('user');
      expect(state.messages[0].content).toBe('Hello, I need help with worship songs');
      expect(state.messages[0].id).toBeDefined();
      expect(state.messages[0].timestamp).toBeInstanceOf(Date);
    });

    it('should add an assistant message', () => {
      const store = useChatStore.getState();
      store.addMessage({
        role: 'assistant',
        content: 'Here are some worship song recommendations',
      });

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].role).toBe('assistant');
    });

    it('should maintain message order', () => {
      const store = useChatStore.getState();
      store.addMessage({ role: 'user', content: 'First message' });
      store.addMessage({ role: 'assistant', content: 'Second message' });
      store.addMessage({ role: 'user', content: 'Third message' });

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(3);
      expect(state.messages[0].content).toBe('First message');
      expect(state.messages[1].content).toBe('Second message');
      expect(state.messages[2].content).toBe('Third message');
    });

    it('should add message with setlist data', () => {
      const mockSetlist = createMockSetlist();

      const store = useChatStore.getState();
      store.addMessage({
        role: 'assistant',
        content: 'Here is your setlist',
        setlist: mockSetlist,
      });

      const state = useChatStore.getState();
      expect(state.messages[0].setlist).toBeDefined();
      expect(state.messages[0].setlist?.setlist).toHaveLength(1);
    });
  });

  describe('setCurrentSetlist', () => {
    it('should set the current setlist', () => {
      const mockSetlist = createMockSetlist();

      const store = useChatStore.getState();
      store.setCurrentSetlist(mockSetlist);

      expect(useChatStore.getState().currentSetlist).toEqual(mockSetlist);
    });

    it('should clear the current setlist', () => {
      const mockSetlist = createMockSetlist({ setlist: [] });

      const store = useChatStore.getState();
      store.setCurrentSetlist(mockSetlist);
      expect(useChatStore.getState().currentSetlist).toBeDefined();

      store.setCurrentSetlist(null);
      expect(useChatStore.getState().currentSetlist).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading to true', () => {
      const store = useChatStore.getState();
      expect(store.isLoading).toBe(false);

      store.setLoading(true);
      expect(useChatStore.getState().isLoading).toBe(true);
    });

    it('should set loading to false', () => {
      useChatStore.setState({ isLoading: true });
      expect(useChatStore.getState().isLoading).toBe(true);

      useChatStore.getState().setLoading(false);
      expect(useChatStore.getState().isLoading).toBe(false);
    });
  });

  describe('clearMessages', () => {
    it('should clear all messages', () => {
      const store = useChatStore.getState();
      store.addMessage({ role: 'user', content: 'Message 1' });
      store.addMessage({ role: 'assistant', content: 'Message 2' });

      expect(useChatStore.getState().messages).toHaveLength(2);

      store.clearMessages();
      expect(useChatStore.getState().messages).toHaveLength(0);
    });

    it('should also clear the current setlist', () => {
      const mockSetlist = createMockSetlist({ setlist: [] });

      const store = useChatStore.getState();
      store.setCurrentSetlist(mockSetlist);
      store.addMessage({ role: 'user', content: 'Message' });

      expect(useChatStore.getState().currentSetlist).toBeDefined();
      expect(useChatStore.getState().messages).toHaveLength(1);

      store.clearMessages();
      expect(useChatStore.getState().currentSetlist).toBeNull();
      expect(useChatStore.getState().messages).toHaveLength(0);
    });
  });
});
