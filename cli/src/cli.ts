#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { WebSocket } from 'ws';
import { spawn } from 'child_process';

interface Config {
  serverUrl: string;
  apiKey?: string;
  fallbackToLocal: boolean;
}

class DebugMateCLI {
  private config: Config;
  private ws: WebSocket | null = null;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): Config {
    const configPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.debugmate', 'config.json');
    
    try {
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
    } catch (error) {
      console.error(chalk.red('Error loading config:'), error);
    }

    // Default config
    return {
      serverUrl: 'ws://localhost:3000',
      fallbackToLocal: true
    };
  }

  private async connectToServer(): Promise<WebSocket | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log(chalk.yellow('Server connection timeout, falling back to local mode'));
        resolve(null);
      }, 5000); // 5초 타임아웃

      this.ws = new WebSocket(this.config.serverUrl);
      
      this.ws.on('open', () => {
        clearTimeout(timeout);
        console.log(chalk.green('Connected to DebugMate server'));
        resolve(this.ws!);
      });

      this.ws.on('error', (error) => {
        clearTimeout(timeout);
        console.log(chalk.yellow('Server connection failed, falling back to local mode'));
        resolve(null);
      });

      this.ws.on('close', () => {
        console.log(chalk.yellow('Disconnected from server'));
      });
    });
  }

  private async callServerFunction(functionName: string, args: any): Promise<any> {
    if (!this.ws) {
      this.ws = await this.connectToServer();
    }

    if (!this.ws) {
      throw new Error('Server unavailable, use local mode');
    }

    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString();
      
      const message = {
        id: requestId,
        method: functionName,
        params: args
      };

      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 30000);

      this.ws!.send(JSON.stringify(message));

      this.ws!.once('message', (data) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(data.toString());
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.result);
          }
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private async runLocalMode(filePath: string, query: string): Promise<void> {
    console.log(chalk.blue('Running in local mode...'));
    console.log(chalk.yellow('Note: You need to set GEMINI_API_KEY environment variable'));
    
    // Check if GEMINI_API_KEY is set
    if (!process.env.GEMINI_API_KEY) {
      console.error(chalk.red('GEMINI_API_KEY environment variable is not set'));
      console.log(chalk.blue('Please set it with: export GEMINI_API_KEY=your_api_key'));
      process.exit(1);
    }

    // Check if gcc is available
    try {
      spawn('gcc', ['--version'], { stdio: 'ignore' });
    } catch (error) {
      console.error(chalk.red('gcc is not installed or not in PATH'));
      console.log(chalk.blue('Please install gcc: sudo apt-get install gcc'));
      process.exit(1);
    }

    // Run the local debug agent
    const debugAgentPath = path.join(__dirname, '../../src/agentica/DebugAgent.ts');
    const tsNodePath = path.join(__dirname, '../../node_modules/.bin/ts-node');
    
    if (!fs.existsSync(tsNodePath)) {
      console.error(chalk.red('ts-node not found. Please run: npm install'));
      process.exit(1);
    }

    const child = spawn(tsNodePath, [debugAgentPath, filePath, query], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..')
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(chalk.red(`Local execution failed with code ${code}`));
        process.exit(code || 1);
      }
    });
  }

  async analyzeFile(filePath: string, query: string) {
    try {
      console.log(chalk.blue(`Analyzing: ${filePath}`));
      console.log(chalk.blue(`Query: ${query}`));
      console.log(chalk.gray('─'.repeat(50)));

      // Try server first
      try {
        const result = await this.callServerFunction('afterDebugFromCode', [fs.readFileSync(filePath, 'utf-8'), path.basename(filePath)]);
        
        console.log(chalk.green('\n[Analysis Result]'));
        console.log(result.analysis);
        
        if (result.markedFilePath) {
          console.log(chalk.blue(`\n[Marked file]: ${result.markedFilePath}`));
        }
      } catch (serverError) {
        console.log(chalk.yellow('Server mode failed, switching to local mode...'));
        await this.runLocalMode(filePath, query);
      }

    } catch (error) {
      console.error(chalk.red('Analysis failed:'), error);
      process.exit(1);
    } finally {
      if (this.ws) {
        this.ws.close();
      }
    }
  }

  async loopCheck(filePath: string, target?: string) {
    try {
      console.log(chalk.blue(`Loop analysis: ${filePath}`));
      if (target) {
        console.log(chalk.blue(`Target: ${target}`));
      }
      console.log(chalk.gray('─'.repeat(50)));

      // Try server first
      try {
        const result = await this.callServerFunction('loopCheck', [{
          code: fs.readFileSync(filePath, 'utf-8'),
          target: target || 'all'
        }]);

        console.log(chalk.green('\n[Loop Analysis Result]'));
        console.log(result.result || result);
      } catch (serverError) {
        console.log(chalk.yellow('Server mode failed, switching to local mode...'));
        await this.runLocalMode(filePath, `루프 ${target || '전체'} 검사`);
      }

    } catch (error) {
      console.error(chalk.red('Loop analysis failed:'), error);
      process.exit(1);
    } finally {
      if (this.ws) {
        this.ws.close();
      }
    }
  }

  async traceVariable(filePath: string, query: string) {
    try {
      console.log(chalk.blue(`Variable tracing: ${filePath}`));
      console.log(chalk.blue(`Query: ${query}`));
      console.log(chalk.gray('─'.repeat(50)));

      // Try server first
      try {
        const result = await this.callServerFunction('traceVar', [{
          code: fs.readFileSync(filePath, 'utf-8'),
          userQuery: query
        }]);

        console.log(chalk.green('\n[Variable Trace Result]'));
        console.log(result.variableTrace || result);
      } catch (serverError) {
        console.log(chalk.yellow('Server mode failed, switching to local mode...'));
        await this.runLocalMode(filePath, query);
      }

    } catch (error) {
      console.error(chalk.red('Variable tracing failed:'), error);
      process.exit(1);
    } finally {
      if (this.ws) {
        this.ws.close();
      }
    }
  }
}

// CLI setup
const program = new Command();
const cli = new DebugMateCLI();

program
  .name('debug-mate')
  .description('C/C++ code analysis and debugging tool')
  .version('1.0.0');

program
  .command('analyze <file> <query>')
  .description('Analyze C/C++ code with natural language query')
  .action(async (file, query) => {
    await cli.analyzeFile(file, query);
  });

program
  .command('loop <file> [target]')
  .description('Analyze loops in C/C++ code')
  .action(async (file, target) => {
    await cli.loopCheck(file, target);
  });

program
  .command('trace <file> <query>')
  .description('Trace variables in C/C++ code')
  .action(async (file, query) => {
    await cli.traceVariable(file, query);
  });

program.parse();
