"""YouTube API Response Cache Service

Provides TTL-based caching for YouTube API responses to minimize API quota usage.
Supports both in-memory caching and optional Redis backend.
"""
import hashlib
import json
from datetime import datetime, timedelta
from typing import Any, Optional
from functools import wraps
import asyncio


class CacheEntry:
    """A single cache entry with TTL support"""

    def __init__(self, value: Any, ttl_seconds: int = 900):
        self.value = value
        self.created_at = datetime.utcnow()
        self.expires_at = self.created_at + timedelta(seconds=ttl_seconds)

    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at

    def time_remaining(self) -> int:
        """Returns remaining TTL in seconds"""
        remaining = (self.expires_at - datetime.utcnow()).total_seconds()
        return max(0, int(remaining))


class MemoryCache:
    """In-memory cache with TTL support"""

    def __init__(self, default_ttl: int = 900):
        self._cache: dict[str, CacheEntry] = {}
        self._default_ttl = default_ttl
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        """Get a value from cache, returns None if expired or not found"""
        async with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            if entry.is_expired():
                del self._cache[key]
                return None
            return entry.value

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set a value in cache with optional custom TTL"""
        ttl = ttl or self._default_ttl
        async with self._lock:
            self._cache[key] = CacheEntry(value, ttl)

    async def delete(self, key: str) -> bool:
        """Delete a key from cache, returns True if key existed"""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    async def clear(self) -> int:
        """Clear all cache entries, returns number of entries cleared"""
        async with self._lock:
            count = len(self._cache)
            self._cache.clear()
            return count

    async def cleanup_expired(self) -> int:
        """Remove all expired entries, returns number of entries removed"""
        async with self._lock:
            expired_keys = [
                key for key, entry in self._cache.items()
                if entry.is_expired()
            ]
            for key in expired_keys:
                del self._cache[key]
            return len(expired_keys)

    async def get_stats(self) -> dict:
        """Get cache statistics"""
        async with self._lock:
            total = len(self._cache)
            expired = sum(1 for entry in self._cache.values() if entry.is_expired())
            return {
                "total_entries": total,
                "active_entries": total - expired,
                "expired_entries": expired
            }


class RedisCache:
    """Redis-backed cache with TTL support (optional)"""

    def __init__(self, redis_url: str, default_ttl: int = 900, prefix: str = "worshipflow:youtube:"):
        self._redis_url = redis_url
        self._default_ttl = default_ttl
        self._prefix = prefix
        self._client = None

    async def _get_client(self):
        """Lazy initialization of Redis client"""
        if self._client is None:
            try:
                import redis.asyncio as redis
                self._client = redis.from_url(self._redis_url)
            except ImportError:
                raise ImportError("redis package required for RedisCache. Install with: pip install redis")
        return self._client

    def _make_key(self, key: str) -> str:
        return f"{self._prefix}{key}"

    async def get(self, key: str) -> Optional[Any]:
        """Get a value from cache"""
        try:
            client = await self._get_client()
            data = await client.get(self._make_key(key))
            if data is None:
                return None
            return json.loads(data)
        except Exception:
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set a value in cache with TTL"""
        ttl = ttl or self._default_ttl
        try:
            client = await self._get_client()
            await client.setex(
                self._make_key(key),
                ttl,
                json.dumps(value, default=str)
            )
        except Exception:
            pass  # Silently fail on cache errors

    async def delete(self, key: str) -> bool:
        """Delete a key from cache"""
        try:
            client = await self._get_client()
            result = await client.delete(self._make_key(key))
            return result > 0
        except Exception:
            return False

    async def clear(self) -> int:
        """Clear all cache entries with our prefix"""
        try:
            client = await self._get_client()
            keys = await client.keys(f"{self._prefix}*")
            if keys:
                return await client.delete(*keys)
            return 0
        except Exception:
            return 0

    async def get_stats(self) -> dict:
        """Get cache statistics"""
        try:
            client = await self._get_client()
            keys = await client.keys(f"{self._prefix}*")
            return {
                "total_entries": len(keys),
                "active_entries": len(keys),
                "expired_entries": 0  # Redis handles expiration automatically
            }
        except Exception:
            return {"total_entries": 0, "active_entries": 0, "expired_entries": 0}


class YouTubeCache:
    """
    High-level YouTube API cache manager.
    Automatically selects between memory and Redis backends.
    """

    # Cache TTL constants (in seconds)
    DEFAULT_TTL = 900  # 15 minutes
    CHANNEL_TTL = 3600  # 1 hour for channel info
    SEARCH_TTL = 900  # 15 minutes for search results
    VIDEO_TTL = 1800  # 30 minutes for video details
    TREND_TTL = 900  # 15 minutes for trend analysis

    def __init__(self, redis_url: Optional[str] = None, default_ttl: int = DEFAULT_TTL):
        self._default_ttl = default_ttl
        if redis_url:
            self._backend = RedisCache(redis_url, default_ttl)
        else:
            self._backend = MemoryCache(default_ttl)
        self._last_updated: dict[str, datetime] = {}

    @staticmethod
    def make_cache_key(*args, **kwargs) -> str:
        """Generate a cache key from function arguments"""
        key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
        return hashlib.md5(key_data.encode()).hexdigest()

    async def get_channel_videos(self, channel_id: str) -> Optional[list]:
        """Get cached channel videos"""
        return await self._backend.get(f"channel_videos:{channel_id}")

    async def set_channel_videos(self, channel_id: str, videos: list) -> None:
        """Cache channel videos"""
        await self._backend.set(f"channel_videos:{channel_id}", videos, self.CHANNEL_TTL)
        self._last_updated[f"channel_videos:{channel_id}"] = datetime.utcnow()

    async def get_search_results(self, query: str, days_back: int) -> Optional[list]:
        """Get cached search results"""
        key = f"search:{self.make_cache_key(query, days_back)}"
        return await self._backend.get(key)

    async def set_search_results(self, query: str, days_back: int, results: list) -> None:
        """Cache search results"""
        key = f"search:{self.make_cache_key(query, days_back)}"
        await self._backend.set(key, results, self.SEARCH_TTL)
        self._last_updated[key] = datetime.utcnow()

    async def get_video_details(self, video_ids: list[str]) -> Optional[dict]:
        """Get cached video details"""
        key = f"video_details:{self.make_cache_key(sorted(video_ids))}"
        return await self._backend.get(key)

    async def set_video_details(self, video_ids: list[str], details: dict) -> None:
        """Cache video details"""
        key = f"video_details:{self.make_cache_key(sorted(video_ids))}"
        await self._backend.set(key, details, self.VIDEO_TTL)
        self._last_updated[key] = datetime.utcnow()

    async def get_trend_analysis(self, days_back: int) -> Optional[dict]:
        """Get cached trend analysis"""
        key = f"trends:{days_back}"
        return await self._backend.get(key)

    async def set_trend_analysis(self, days_back: int, analysis: dict) -> None:
        """Cache trend analysis"""
        key = f"trends:{days_back}"
        await self._backend.set(key, analysis, self.TREND_TTL)
        self._last_updated[key] = datetime.utcnow()

    def get_last_updated(self, key: str) -> Optional[datetime]:
        """Get the last update time for a cache key"""
        return self._last_updated.get(key)

    async def clear_all(self) -> int:
        """Clear all cached data"""
        self._last_updated.clear()
        return await self._backend.clear()

    async def get_stats(self) -> dict:
        """Get cache statistics"""
        stats = await self._backend.get_stats()
        stats["last_updates"] = {
            key: dt.isoformat() for key, dt in self._last_updated.items()
        }
        return stats


def cached(ttl: int = YouTubeCache.DEFAULT_TTL, key_prefix: str = ""):
    """
    Decorator for caching async function results.

    Usage:
        @cached(ttl=900, key_prefix="search")
        async def search_videos(query: str) -> list:
            ...
    """
    def decorator(func):
        _cache = MemoryCache(ttl)

        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{key_prefix}:{YouTubeCache.make_cache_key(*args, **kwargs)}"

            # Try to get from cache
            cached_result = await _cache.get(cache_key)
            if cached_result is not None:
                return cached_result

            # Execute function and cache result
            result = await func(*args, **kwargs)
            await _cache.set(cache_key, result, ttl)
            return result

        # Expose cache operations
        wrapper.cache_clear = _cache.clear
        wrapper.cache_stats = _cache.get_stats

        return wrapper
    return decorator


# Global cache instance
youtube_cache = YouTubeCache()
