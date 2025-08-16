/**
 * CacheManager - 캐시 관리 유틸리티
 * 분석 결과와 같은 비용이 많이 드는 작업의 결과를 캐시하여 성능을 향상시킵니다.
 */

export interface CacheConfig {
  maxSize: number;
  maxValueSize: number;
  ttl?: number; // Time to live in milliseconds
}

export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl?: number;
}

export class CacheManager<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100,
      maxValueSize: 10000,
      ttl: undefined,
      ...config
    };
    this.cache = new Map();
  }

  /**
   * 캐시에 값을 추가합니다.
   * @param key 캐시 키
   * @param value 캐시할 값
   * @returns 성공 여부
   */
  set(key: string, value: T): boolean {
    try {
      // 값 크기 체크
      const valueSize = this.calculateValueSize(value);
      if (valueSize > this.config.maxValueSize) {
        console.warn(`[CacheManager] Value size (${valueSize}) exceeds max value size (${this.config.maxValueSize})`);
        return false;
      }

      // 캐시 크기 제한 체크 및 정리
      if (this.cache.size >= this.config.maxSize) {
        this.evictOldest();
      }

      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttl: this.config.ttl
      };

      this.cache.set(key, entry);
      return true;
    } catch (error) {
      console.error('[CacheManager] Error setting cache:', error);
      return false;
    }
  }

  /**
   * 캐시에서 값을 가져옵니다.
   * @param key 캐시 키
   * @returns 캐시된 값 또는 undefined
   */
  get(key: string): T | undefined {
    try {
      const entry = this.cache.get(key);
      if (!entry) {
        return undefined;
      }

      // TTL 체크
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        return undefined;
      }

      return entry.value;
    } catch (error) {
      console.error('[CacheManager] Error getting cache:', error);
      return undefined;
    }
  }

  /**
   * 캐시에 키가 존재하는지 확인합니다.
   * @param key 캐시 키
   * @returns 존재 여부
   */
  has(key: string): boolean {
    try {
      const entry = this.cache.get(key);
      if (!entry) {
        return false;
      }

      // TTL 체크
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[CacheManager] Error checking cache:', error);
      return false;
    }
  }

  /**
   * 캐시에서 특정 키를 제거합니다.
   * @param key 캐시 키
   * @returns 제거 성공 여부
   */
  delete(key: string): boolean {
    try {
      return this.cache.delete(key);
    } catch (error) {
      console.error('[CacheManager] Error deleting cache:', error);
      return false;
    }
  }

  /**
   * 캐시를 완전히 비웁니다.
   */
  clear(): void {
    try {
      this.cache.clear();
    } catch (error) {
      console.error('[CacheManager] Error clearing cache:', error);
    }
  }

  /**
   * 캐시 크기를 반환합니다.
   * @returns 현재 캐시 크기
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 캐시 사용률을 반환합니다.
   * @returns 사용률 (0.0 ~ 1.0)
   */
  usage(): number {
    return this.cache.size / this.config.maxSize;
  }

  /**
   * 캐시 통계를 반환합니다.
   * @returns 캐시 통계 정보
   */
  getStats(): {
    size: number;
    maxSize: number;
    usage: number;
    maxValueSize: number;
    ttl: number | undefined;
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      usage: this.usage(),
      maxValueSize: this.config.maxValueSize,
      ttl: this.config.ttl
    };
  }

  /**
   * 만료된 캐시 항목들을 정리합니다.
   * @returns 정리된 항목 수
   */
  cleanup(): number {
    let cleanedCount = 0;
    const now = Date.now();

    try {
      for (const [key, entry] of this.cache.entries()) {
        if (entry.ttl && now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }
    } catch (error) {
      console.error('[CacheManager] Error during cleanup:', error);
    }

    return cleanedCount;
  }

  /**
   * 가장 오래된 캐시 항목을 제거합니다.
   */
  private evictOldest(): void {
    try {
      let oldestKey: string | undefined;
      let oldestTimestamp = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    } catch (error) {
      console.error('[CacheManager] Error evicting oldest:', error);
    }
  }

  /**
   * 값의 크기를 계산합니다.
   * @param value 크기를 계산할 값
   * @returns 바이트 단위 크기 (근사값)
   */
  private calculateValueSize(value: T): number {
    try {
      if (typeof value === 'string') {
        return new Blob([value]).size;
      } else if (typeof value === 'object') {
        return new Blob([JSON.stringify(value)]).size;
      } else {
        return new Blob([String(value)]).size;
      }
    } catch (error) {
      // JSON.stringify 실패 시 문자열 길이로 대체
      return String(value).length;
    }
  }
}

// 기본 캐시 인스턴스 (기존 코드와의 호환성을 위해)
export const analysisCache = new CacheManager<string>({
  maxSize: 100,
  maxValueSize: 10000
});

// 기존 코드와의 호환성을 위한 함수들
export function addToCache(key: string, value: string): boolean {
  return analysisCache.set(key, value);
}

export function getFromCache(key: string): string | undefined {
  return analysisCache.get(key);
}

export function hasInCache(key: string): boolean {
  return analysisCache.has(key);
}

export function clearCache(): void {
  analysisCache.clear();
}
