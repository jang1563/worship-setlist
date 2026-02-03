import React, { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '../../stores/playerStore';

interface YouTubePlayerProps {
  videoId: string;
  onReady?: () => void;
  onError?: (error: number) => void;
  className?: string;
}

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  onReady,
  onError,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isPlayerReadyRef = useRef<boolean>(false);
  const previousVideoIdRef = useRef<string>(videoId);

  const {
    setPlayerRef,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setIsReady,
    playbackRate,
    volume,
  } = usePlayerStore();

  const initPlayer = useCallback(() => {
    if (!containerRef.current || !window.YT) return;

    // 기존 플레이어 제거
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        console.warn('Failed to destroy player:', e);
      }
    }

    isPlayerReadyRef.current = false;
    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        playsinline: 1,
      },
      events: {
        onReady: (event) => {
          const player = event.target;
          isPlayerReadyRef.current = true;
          setPlayerRef(player);
          setDuration(player.getDuration());
          setIsReady(true);
          player.setVolume(volume);
          player.setPlaybackRate(playbackRate);
          onReady?.();

          // 시간 업데이트 인터벌
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          intervalRef.current = window.setInterval(() => {
            if (player.getPlayerState() === window.YT.PlayerState.PLAYING) {
              setCurrentTime(player.getCurrentTime());
            }
          }, 100);
        },
        onStateChange: (event) => {
          const state = event.data;
          setIsPlaying(state === window.YT.PlayerState.PLAYING);

          if (state === window.YT.PlayerState.ENDED) {
            setCurrentTime(0);
          }
        },
        onError: (event) => {
          onError?.(event.data);
        },
      },
    });
  }, [videoId, volume, playbackRate, setPlayerRef, setIsPlaying, setCurrentTime, setDuration, setIsReady, onReady, onError]);

  // YouTube API 로드
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // API 스크립트 로드
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(script);
      }

      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [initPlayer]);

  // videoId 변경 시 재초기화
  useEffect(() => {
    // Skip if videoId hasn't actually changed
    if (videoId === previousVideoIdRef.current) {
      return;
    }
    previousVideoIdRef.current = videoId;

    if (window.YT && window.YT.Player && videoId) {
      // Only use loadVideoById if player is ready and method exists
      if (
        playerRef.current &&
        isPlayerReadyRef.current &&
        typeof playerRef.current.loadVideoById === 'function'
      ) {
        try {
          playerRef.current.loadVideoById(videoId);
        } catch (e) {
          console.warn('loadVideoById failed, reinitializing player:', e);
          initPlayer();
        }
      } else {
        // Player not ready or method unavailable, reinitialize
        initPlayer();
      }
    }
  }, [videoId, initPlayer]);

  // playbackRate 변경 시 플레이어에 적용
  useEffect(() => {
    if (playerRef.current) {
      try {
        playerRef.current.setPlaybackRate(playbackRate);
      } catch (e) {
        console.warn('Failed to set playback rate:', e);
      }
    }
  }, [playbackRate]);

  // volume 변경 시 플레이어에 적용
  useEffect(() => {
    if (playerRef.current) {
      try {
        playerRef.current.setVolume(volume);
      } catch (e) {
        console.warn('Failed to set volume:', e);
      }
    }
  }, [volume]);

  return (
    <div className={`relative aspect-video bg-black rounded-lg overflow-hidden ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default YouTubePlayer;
