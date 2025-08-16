import * as fs from 'fs';
import * as path from 'path';

export class FileUtils {
  /**
   * 파일 존재 여부 확인
   */
  static exists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  /**
   * 파일 읽기
   */
  static readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): string {
    try {
      if (!this.exists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      return fs.readFileSync(filePath, encoding);
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  /**
   * 파일 쓰기
   */
  static writeFile(filePath: string, content: string, encoding: BufferEncoding = 'utf-8'): void {
    try {
      // 디렉토리가 없으면 생성
      const dir = path.dirname(filePath);
      if (!this.exists(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, encoding);
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  /**
   * 파일 확장자 확인
   */
  static getExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
  }

  /**
   * 파일명 추출 (확장자 제외)
   */
  static getFileNameWithoutExtension(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * 파일 크기 확인
   */
  static getFileSize(filePath: string): number {
    try {
      if (!this.exists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      throw new Error(`Failed to get file size for ${filePath}: ${error.message}`);
    }
  }

  /**
   * 임시 파일 경로 생성
   */
  static createTempFilePath(prefix: string, extension: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const tmpDir = process.platform === "win32" ? path.join(process.cwd(), "tmp") : "/tmp";
    
    // Windows에서는 tmp 디렉토리 생성
    if (process.platform === "win32" && !this.exists(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    return path.join(tmpDir, `${prefix}_${timestamp}_${random}${extension}`);
  }

  /**
   * 파일 정리 (삭제)
   */
  static cleanupFile(filePath: string): boolean {
    try {
      if (this.exists(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * C/C++ 소스 파일인지 확인
   */
  static isCSourceFile(filePath: string): boolean {
    const extensions = ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hh', '.hxx'];
    return extensions.includes(this.getExtension(filePath));
  }

  /**
   * 파일 백업 생성
   */
  static createBackup(originalPath: string, backupSuffix: string = '_backup'): string {
    try {
      if (!this.exists(originalPath)) {
        throw new Error(`Original file not found: ${originalPath}`);
      }

      const dir = path.dirname(originalPath);
      const ext = path.extname(originalPath);
      const name = path.basename(originalPath, ext);
      const backupPath = path.join(dir, `${name}${backupSuffix}${ext}`);

      const content = this.readFile(originalPath);
      this.writeFile(backupPath, content);

      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create backup for ${originalPath}: ${error.message}`);
    }
  }
}
