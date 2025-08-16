/**
 * Common Imports - 자주 사용되는 공통 import문들
 * 이 파일에서 import한 것들을 다른 파일에서 재사용할 수 있습니다.
 */

// Node.js 내장 모듈들
export { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
export { resolve, join, parse, extname, basename, dirname } from 'path';
export { spawnSync, execSync } from 'child_process';
export { createInterface } from 'readline';

// 타입 정의들
export type { SpawnSyncOptions, SpawnSyncReturns } from 'child_process';
export type { BufferEncoding } from 'buffer';
export type { NodeJS } from 'process';

// 환경 변수
export const isWindows = process.platform === "win32";
export const isUnix = process.platform === "unix" || process.platform === "darwin";
export const isLinux = process.platform === "linux";
export const isMacOS = process.platform === "darwin";

// 공통 상수들
export const DEFAULT_TIMEOUT = 30000; // 30초
export const DEFAULT_ENCODING = 'utf-8' as BufferEncoding;
export const TMP_DIR = isWindows ? join(process.cwd(), "tmp") : "/tmp";
