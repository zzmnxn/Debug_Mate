/**
 * Utility Imports - 유틸리티 관련 import문들
 * ProcessUtils, InputUtils 등에서 사용하는 import들을 모아놓았습니다.
 */

// Node.js 내장 모듈들
export { spawnSync } from 'child_process';
export { createInterface } from 'readline';

// 타입 정의들
export type { SpawnSyncOptions, SpawnSyncReturns } from 'child_process';
export type { BufferEncoding } from 'buffer';
export type { NodeJS } from 'process';

// 내부 모듈들
export { errorHandler, ErrorCategory, ErrorSeverity } from '../utils/ErrorHandler';

// 공통 import들
export { DEFAULT_TIMEOUT, DEFAULT_ENCODING } from './common';
