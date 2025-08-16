/**
 * Handler Imports - 핸들러 관련 import문들
 * DebugHandler, LoopHandler 등에서 사용하는 import들을 모아놓았습니다.
 */

// 외부 라이브러리들
export { GoogleGenerativeAI } from "@google/generative-ai";

// 설정 및 환경
export { SGlobal } from "../config/SGlobal";

// 파싱 관련
export { CompilerError, CompilerWarning, CompilerResultParser } from '../../parsing/compilerResultParser';

// 타입들
export type { 
  CompilerError, 
  CompilerWarning 
} from '../../parsing/compilerResultParser';

// 공통 import들
export { 
  readFileSync, 
  writeFileSync, 
  existsSync, 
  mkdirSync, 
  unlinkSync,
  TMP_DIR,
  isWindows
} from './common';
export { resolve, join, parse } from 'path';
export { spawnSync } from 'child_process';
