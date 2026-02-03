import { useEffect, useRef, useCallback } from 'react';
import { usePracticeStore } from '../stores/practiceStore';

interface UseAutoScrollOptions {
  currentTime: number;
  timestamps: { time: number; element: HTMLElement | null }[];
  enabled?: boolean;
}

export function useAutoScroll({
  currentTime,
  timestamps,
  enabled: enabledProp,
}: UseAutoScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { autoScroll, scrollOffset } = usePracticeStore();

  const enabled = enabledProp ?? autoScroll;

  const scrollToElement = useCallback(
    (element: HTMLElement | null) => {
      if (!element || !containerRef.current || !enabled) return;

      const container = containerRef.current;

      const scrollTop =
        element.offsetTop - container.offsetTop - scrollOffset;

      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      });
    },
    [enabled, scrollOffset]
  );

  useEffect(() => {
    if (!enabled || timestamps.length === 0) return;

    // 현재 시간에 해당하는 타임스탬프 찾기
    let currentIndex = -1;
    for (let i = timestamps.length - 1; i >= 0; i--) {
      if (timestamps[i].time <= currentTime) {
        currentIndex = i;
        break;
      }
    }

    if (currentIndex >= 0 && timestamps[currentIndex].element) {
      scrollToElement(timestamps[currentIndex].element);
    }
  }, [currentTime, timestamps, enabled, scrollToElement]);

  return { containerRef };
}

// 코드 요소에 대한 ref 관리 훅
export function useChordRefs() {
  const refsRef = useRef<Map<number, HTMLElement>>(new Map());

  const setRef = useCallback((index: number, element: HTMLElement | null) => {
    if (element) {
      refsRef.current.set(index, element);
    } else {
      refsRef.current.delete(index);
    }
  }, []);

  const getRef = useCallback((index: number) => {
    return refsRef.current.get(index) || null;
  }, []);

  const getAllRefs = useCallback(() => {
    return Array.from(refsRef.current.entries()).map(([index, element]) => ({
      index,
      element,
    }));
  }, []);

  return { setRef, getRef, getAllRefs };
}
