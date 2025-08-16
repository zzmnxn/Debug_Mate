/**
 * Core Imports - 코어 서비스 관련 import문들
 * InProgressRunService 등에서 사용하는 import들을 모아놓았습니다.
 */

// Node.js 내장 모듈들
export { readFileSync } from 'fs';
export { resolve } from 'path';

// 내부 모듈들
export { beforeDebug } from '../handlers/DebugHandler';
export { ProcessUtils } from '../utils/ProcessUtils';
export { InputUtils } from '../utils/InputUtils';
export { errorHandler, ErrorCategory, ErrorSeverity } from '../utils/ErrorHandler';

// 타입들
export type { ProcessResult } from '../utils/ProcessUtils';
export type { InputOptions } from '../utils/InputHandler';
export type { InProgressRunConfig } from '../types/DebugTypes';

// 공통 import들
export { DEFAULT_TIMEOUT } from './common';
