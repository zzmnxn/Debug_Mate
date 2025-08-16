// 새로운 구조를 위한 메인 index.ts 파일
// 이 파일은 새로운 구조의 모든 기능을 export합니다.

// 핸들러들
export * from './handlers/DebugHandler';
export * from './handlers/LoopHandler';
export * from './handlers/VariableHandler';
export * from './handlers/MemoryHandler';

// 파서들
export * from './parsers/IntentParser';
export * from './parsers/QueryParser';
export * from './parsers/ResponseParser';

// 유틸리티들
export * from './utils/FileUtils';
export * from './utils/CodeUtils';
export * from './utils/CacheManager';
export * from './utils/ErrorHandler';

// 타입들
export * from './types/DebugTypes';
export * from './types/IntentTypes';
export * from './types/ResponseTypes';

// 레거시 지원 (점진적 마이그레이션)
export * from './legacy/handlers';
export * from './legacy/DebugAgent';
