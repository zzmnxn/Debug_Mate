#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import * as readline from 'readline';

interface Config {
  serverUrl: string;
  timeout: number;
}

class DebugMateCLI {
  private config: Config;
  private axiosInstance: axios.AxiosInstance;

  constructor() {
    this.config = this.loadConfig();
    this.axiosInstance = axios.create({
      baseURL: this.config.serverUrl,
      timeout: this.config.timeout,
      headers: {
        'User-Agent': 'DebugMate-CLI/1.0.0'
      }
    });
  }

  private loadConfig(): Config {
    const configPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.debugmate', 'config.json');
    
    try {
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
    } catch (error) {
      console.error(chalk.red('설정 파일 로드 오류:'), error);
    }

    // 기본 설정
    return {
      serverUrl: process.env.DEBUGMATE_SERVER_URL || 'http://localhost:3000',
      timeout: 30000
    };
  }

  private async checkServerHealth(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/healthz');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private async uploadFileAndAnalyze(filePath: string, query: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('query', query);

    const response = await this.axiosInstance.post('/api/analyze', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return response.data;
  }

  private async runInProgressDebug(filePath: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    const response = await this.axiosInstance.post('/api/inprogress-debug', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return response.data;
  }

  private async runDebugAgent(code: string, userQuery: string, filename: string): Promise<any> {
    const response = await this.axiosInstance.post('/api/debug-agent', {
      code: code,
      userQuery: userQuery,
      filename: filename
    });

    return response.data;
  }

  private async getUserInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  // inprogress-run.ts의 기능을 재현하는 메서드
  async inProgressRun(filePath: string) {
    try {
      console.log(chalk.blue(`📁 분석 파일: ${filePath}`));
      console.log(chalk.gray('─'.repeat(50)));

      // 서버 상태 확인
      const isHealthy = await this.checkServerHealth();
      if (!isHealthy) {
        throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
      }

      console.log(chalk.yellow('🔄 InProgressDebug 실행 중...'));

      // 1단계: InProgressDebug 실행
      const inProgressResult = await this.runInProgressDebug(filePath);
      
      if (!inProgressResult.success) {
        throw new Error(inProgressResult.error || 'InProgressDebug 실행 실패');
      }

      console.log(chalk.green('\n✅ InProgressDebug 완료!'));
      console.log(chalk.cyan('\n📊 InProgressDebug 결과:'));
      console.log(inProgressResult.inProgressResult);
      console.log(chalk.gray('\n─'.repeat(50)));

      // 입력받을 수 없는 환경이면 즉시 종료
      if (!process.stdin.isTTY) {
        console.log(chalk.yellow('\n⚠️ 대화형 모드가 불가능한 환경입니다.'));
        process.exit(0);
      }

      // 2단계: 사용자 요청 받기
      const userQuery = await this.getUserInput('\n🔍 요청 사항을 입력하시오: ');
      
      // 빈 입력이면 안내 후 종료
      if (!userQuery) {
        console.log(chalk.yellow('\n(빈 입력 감지) 추가 디버깅 없이 종료합니다.\n'));
        process.exit(0);
      }

      console.log(chalk.yellow('\n🔄 DebugAgent 실행 중...'));

      // 3단계: DebugAgent 실행
      const code = fs.readFileSync(filePath, 'utf-8');
      const debugResult = await this.runDebugAgent(code, userQuery, path.basename(filePath));
      
      if (!debugResult.success) {
        throw new Error(debugResult.error || 'DebugAgent 실행 실패');
      }

      console.log(chalk.green('\n✅ DebugAgent 완료!'));
      console.log(chalk.cyan('\n🔍 DebugAgent 결과:'));
      console.log(debugResult.debugResult.analysis);
      
      if (debugResult.debugResult.markedFilePath) {
        console.log(chalk.blue(`\n📝 표시된 파일: ${debugResult.debugResult.markedFilePath}`));
      }

      console.log(chalk.gray('\n─'.repeat(50)));
      console.log(chalk.green('🎉 분석이 완료되었습니다!\n'));

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          console.error(chalk.red('❌ 서버에 연결할 수 없습니다.'));
          console.log(chalk.yellow('💡 해결 방법:'));
          console.log('   1. 서버가 실행 중인지 확인: npm run start:http');
          console.log('   2. 포트가 올바른지 확인: http://localhost:3000');
          console.log('   3. 방화벽 설정 확인');
        } else if (error.response?.status === 413) {
          console.error(chalk.red('❌ 파일이 너무 큽니다. (5MB 제한)'));
        } else {
          console.error(chalk.red('❌ 서버 오류:'), error.response?.data?.error || error.message);
        }
      } else {
        console.error(chalk.red('❌ 실행 실패:'), error instanceof Error ? error.message : error);
      }
      process.exit(1);
    }
  }

  async analyzeFile(filePath: string, query: string) {
    try {
      console.log(chalk.blue(`📁 분석 파일: ${filePath}`));
      console.log(chalk.blue(`🔍 쿼리: ${query}`));
      console.log(chalk.gray('─'.repeat(50)));

      // 서버 상태 확인
      const isHealthy = await this.checkServerHealth();
      if (!isHealthy) {
        throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
      }

      console.log(chalk.yellow('🔄 서버에 분석 요청 중...'));

      // 파일 업로드 및 분석
      const result = await this.uploadFileAndAnalyze(filePath, query);
      
      if (result.success) {
        console.log(chalk.green('\n✅ 분석 완료!'));
        console.log(chalk.cyan('\n📊 분석 결과:'));
        console.log(result.analysis);
        
        if (result.markedFilePath) {
          console.log(chalk.blue(`\n📝 표시된 파일: ${result.markedFilePath}`));
        }
      } else {
        throw new Error(result.error || '알 수 없는 오류');
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          console.error(chalk.red('❌ 서버에 연결할 수 없습니다.'));
          console.log(chalk.yellow('💡 해결 방법:'));
          console.log('   1. 서버가 실행 중인지 확인: npm run start:http');
          console.log('   2. 포트가 올바른지 확인: http://localhost:3000');
          console.log('   3. 방화벽 설정 확인');
        } else if (error.response?.status === 413) {
          console.error(chalk.red('❌ 파일이 너무 큽니다. (5MB 제한)'));
        } else {
          console.error(chalk.red('❌ 서버 오류:'), error.response?.data?.error || error.message);
        }
      } else {
        console.error(chalk.red('❌ 분석 실패:'), error instanceof Error ? error.message : error);
      }
      process.exit(1);
    }
  }

  async serverStatus() {
    try {
      const response = await this.axiosInstance.get('/api/info');
      console.log(chalk.green('✅ 서버 상태: 정상'));
      console.log(chalk.cyan('📊 서버 정보:'));
      console.log(`   이름: ${response.data.name}`);
      console.log(`   버전: ${response.data.version}`);
      console.log(`   환경: ${response.data.environment}`);
      console.log(`   시간: ${response.data.timestamp}`);
    } catch (error) {
      console.error(chalk.red('❌ 서버 상태 확인 실패:'), error instanceof Error ? error.message : error);
    }
  }
}

// CLI 설정
const program = new Command();
const cli = new DebugMateCLI();

program
  .name('debug-mate')
  .description('C/C++ 코드 분석 및 디버깅 도구 (inprogress-run.ts 기반)')
  .version('1.0.0');

program
  .command('run <file>')
  .description('inprogress-run.ts와 동일한 대화형 분석 실행')
  .action(async (file) => {
    await cli.inProgressRun(file);
  });

program
  .command('analyze <file> <query>')
  .description('자연어 쿼리로 C/C++ 코드 분석')
  .action(async (file, query) => {
    await cli.analyzeFile(file, query);
  });

program
  .command('status')
  .description('서버 상태 확인')
  .action(async () => {
    await cli.serverStatus();
  });

program.parse();
