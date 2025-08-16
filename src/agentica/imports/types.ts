/**
 * Type Imports - 타입 관련 import문들
 * 각 타입 정의 파일에서 사용하는 import들을 모아놓았습니다.
 */

// 내부 타입들
export type { CompilerError, CompilerWarning } from '../../parsing/compilerResultParser';
export type { ErrorCategory, ErrorSeverity } from '../utils/ErrorHandler';

// 공통 타입들
export type { BufferEncoding } from 'buffer';
export type { NodeJS } from 'process';
