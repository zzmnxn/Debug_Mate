import { existsSync, readFileSync, statSync } from 'fs';
import * as path from 'path';

export class FileUtils {
  /**
   * 주어진 경로를 절대 경로로 바꾸고 파일명 반환
   */
  static ensurePath(inputPath: string): { absolutePath: string; fileName: string } {
    const absolutePath = path.resolve(inputPath);
    if (!existsSync(absolutePath)) {
      throw new Error(`파일을 찾을 수 없습니다: ${absolutePath}`);
    }
    const st = statSync(absolutePath);
    if (!st.isFile()) {
      throw new Error(`파일 경로가 아닙니다: ${absolutePath}`);
    }
    const fileName = path.basename(absolutePath);
    return { absolutePath, fileName };
  }

  /**
   * 파일을 읽고, 실패 시 프로세스를 종료(기존 CLI 사용성 유지)
   */
  static readCodeOrExit(absolutePath: string): string {
    try {
      return readFileSync(absolutePath, 'utf8');
    } catch (e: any) {
      console.error('[FileUtils] 파일 읽기 실패:', e?.message ?? String(e));
      process.exit(1);
    }
  }

  /** (보조) 텍스트 파일 동기 읽기 */
  static readTextFile(absolutePath: string): string {
    return readFileSync(absolutePath, 'utf8');
  }
}
