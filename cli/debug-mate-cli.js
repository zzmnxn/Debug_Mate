#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve, basename } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ASCII 아트 로고
const LOGO = `
${chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════
║                                                              
║  ${chalk.yellow.bold('DebugMate')} - C/C++ AI 디버깅 도구      
║  ${chalk.gray('파일 감시 • 대화형 분석 • tmux 분할 화면')}       
║                                                              
╚══════════════════════════════════════════════════════════════
`)}`;

// 버전 정보
const VERSION = '1.1.0';

// CLI 설정
const program = new Command();

// 기본 설정
program
  .name('debug-mate')
  .description(chalk.cyan('C/C++ 코드 분석을 위한 AI 기반 대화형 디버깅 도구'))
  .version(chalk.green(`v${VERSION}`), '-v, --version')
  .usage(chalk.yellow('<command> [options]'))
  .helpOption('-h, --help', chalk.gray('도움말 표시'));

// 글로벌 옵션
program
  .option('-d, --debug', chalk.gray('디버그 모드 활성화'))
  .option('-q, --quiet', chalk.gray('조용한 모드 (최소 출력)'));

// 플랫폼 체크 함수
function checkPlatform() {
  if (process.platform !== 'linux') {
    console.error(chalk.red(' 이 CLI는 Linux 환경에서만 실행할 수 있습니다.'));
    console.log(chalk.yellow(' 현재 플랫폼: ' + process.platform));
    console.log(chalk.blue(' 해결 방법:'));
    console.log(chalk.cyan('   1. WSL2 (Windows Subsystem for Linux) 사용'));
    console.log(chalk.cyan('   2. Linux 가상머신 사용'));
    console.log(chalk.cyan('   3. GitHub Codespaces 사용'));
    console.log(chalk.gray('   자세한 내용: https://github.com/zzmnxn/Debug_Mate#readme'));
    process.exit(1);
  }
}
// === REPLACE: tmuxDebug() ===
async function tmuxDebug(file, options = {}) {
  // CLI에서 --left 로 전달된 값과의 호환을 위해 leftSize 유지
  const { session, leftSize = 40 } = options;

  console.log(chalk.blue(`  tmux 분할 화면 모드 시작...`));
  console.log(chalk.gray(' 왼쪽: vi 편집기, 오른쪽: 자동 분석 실행(inprogress-run.ts)'));
  console.log(chalk.yellow(' 패널 간 이동: Ctrl+b + h(왼쪽) / l(오른쪽) / j(아래) / k(위)'));
  console.log(chalk.gray(' 종료는 tmux 세션 종료(Ctrl+b :kill-session 또는 별도 터미널에서 tmux kill-session -t <세션>)\n'));

  // 필수 도구 확인
  try { execSync('tmux -V', { encoding: 'utf8' }); }
  catch { console.error(chalk.red('tmux 미설치: sudo apt install -y tmux')); process.exit(1); }

  try { 
    execSync('which inotifywait', { encoding: 'utf8' });
    // inotifywait가 설치되어 있는지만 확인하고, 실제 실행은 나중에
    console.log(chalk.green('✓ inotifywait 확인됨'));
  }
  catch { 
    console.error(chalk.red('inotifywait 명령어를 찾을 수 없습니다.'));
    console.error(chalk.yellow('다음 명령어로 설치해주세요:'));
    console.error(chalk.cyan('  sudo apt update && sudo apt install -y inotify-tools'));
    console.error(chalk.gray('또는 PATH에 inotifywait가 있는지 확인해주세요.'));
    process.exit(1); 
  }

  // 파일 경로 정규화
  const filePath = resolve(file);
  const fileName = basename(file);
  const fileDir = dirname(filePath);

  // 세션명 안전화 (/, ., 공백, : → -)
  const cleanSession = (session || `dm-${fileName}`).replace(/[\/\.\s:]/g, '-');

  // 파일 없으면 기본 템플릿 생성
  const initSnippet = `
    TARGET_FILE="${filePath}"
    if [ ! -f "$TARGET_FILE" ]; then
      cat > "$TARGET_FILE" <<'EOF'
#include <stdio.h>
int main(void){
  printf("Hello DebugMate!\\n");
  return 0;
}
EOF
    fi
  `;

  // 기존 세션 종료 시도(있으면 정리)
  try { execSync(`tmux kill-session -t "${cleanSession}" 2>/dev/null`); } catch {}

  // 오른쪽 패널에서 실행할 "저장 감시 + 분석" 파이프라인
  // watch-and-debug.sh 스크립트를 사용하여 더 안정적으로 실행
  const rightPaneCmd = `bash "${__dirname}/../watch-and-debug.sh" "${filePath}"`;

  // tmux 스크립트 - 개별 명령어로 실행
  const tmuxScript = `
    set -eo pipefail
    ${initSnippet}

    # 새 세션 생성: 왼쪽=vi
    tmux new-session -d -s "${cleanSession}" -n editor "vi '${filePath}'"
    sleep 1

    # 오른쪽=저장 감시+자동 실행
    tmux split-window -h -t "${cleanSession}:editor" ${JSON.stringify(rightPaneCmd)}
    sleep 1

    # 왼쪽 폭(열 수) 조절 - 터미널 크기에 따라 동적으로 계산
    TERM_WIDTH=$(tput cols)
    LEFT_WIDTH=$(($TERM_WIDTH * ${Number(leftSize) || 40} / 100))
    tmux resize-pane -t "${cleanSession}:editor".0 -x $LEFT_WIDTH
    sleep 0.5

    # tmux 설정 파일 로드
    tmux source-file "${__dirname}/../.tmux.conf"

    # 포커스는 왼쪽(vi)
    tmux select-pane -t "${cleanSession}:editor".0

    # 세션 접속
    tmux attach -t "${cleanSession}"
  `;

  const child = spawn('bash', ['-lc', tmuxScript], {
    stdio: 'inherit',
    env: { ...process.env }
  });

  child.on('error', (err) => {
    console.error(chalk.red(`tmux 실행 오류: ${err.message}`));
    process.exit(1);
  });
}



// 기본 디버깅 명령어 (tmux 분할 화면이 기본)
program
  .command('debug <file>')
  .alias('d')
  .description(chalk.cyan('tmux 분할 화면으로 파일 감시 및 자동 디버깅'))
  .option('-s, --session <name>', chalk.gray('tmux 세션 이름 지정'))
  .option('-l, --left <percent>', chalk.gray('왼쪽 패널 크기 퍼센트 (기본: 40%)'), '40')
  .option('-t, --timeout <ms>', chalk.gray('타임아웃 설정 (기본: 30000ms)'), '30000')
  .action(async (file, options) => {
    console.log(LOGO);
    checkPlatform();
    
    if (!existsSync(file)) {
      console.log(chalk.yellow(` 파일이 존재하지 않습니다: ${file}`));
      console.log(chalk.blue('기본 C 템플릿을 생성하고 시작합니다...'));
    }

    await tmuxDebug(file, options);
  });

// tmux 분할 화면 명령어 (별도 옵션으로 유지)
program
  .command('tmux <file>')
  .alias('t')
  .description(chalk.cyan('tmux 분할 화면으로 디버깅 (debug 명령어와 동일)'))
  .option('-s, --session <name>', chalk.gray('tmux 세션 이름 지정'))
  .option('-l, --left <percent>', chalk.gray('왼쪽 패널 크기 퍼센트 (기본: 40%)'), '40')
  .action(async (file, options) => {
    console.log(LOGO);
    checkPlatform();
    
    if (!existsSync(file)) {
      console.log(chalk.yellow(` 파일이 존재하지 않습니다: ${file}`));
      console.log(chalk.blue('기본 C 템플릿을 생성하고 시작합니다...'));
    }

    await tmuxDebug(file, options);
  });

// 테스트 코드 생성 명령어 (generate-test.sh 사용)
program
  .command('generate [name]')
  .alias('g')
  .description(chalk.cyan('테스트 코드 자동 생성'))
  .option('-t, --type <type>', chalk.gray('테스트 타입 (1-9)'))
  .option('-l, --list', chalk.gray('사용 가능한 테스트 타입 목록'))
  .action(async (name = 'test', options) => {
    console.log(LOGO);
    checkPlatform();

    if (options.list) {
      console.log(chalk.blue('사용 가능한 테스트 타입:'));
      console.log(chalk.cyan('1. 기본 Hello World'));
      console.log(chalk.cyan('2. 루프 테스트 (for)'));
      console.log(chalk.cyan('3. 조건문 테스트 (if-else)'));
      console.log(chalk.cyan('4. 배열 테스트'));
      console.log(chalk.cyan('5. 함수 테스트'));
      console.log(chalk.cyan('6. 포인터 테스트'));
      console.log(chalk.cyan('7. 에러가 있는 코드 (컴파일 에러)'));
      console.log(chalk.cyan('8. 런타임 에러 코드'));
      console.log(chalk.cyan('9. 복합 테스트 (여러 기능 포함)'));
      return;
    }

    console.log(chalk.blue(`테스트 코드 생성 중...`));
    console.log(chalk.gray(`파일명: ${name}.c`));

    // generate-test.sh 스크립트 호출
    const scriptPath = join(__dirname, 'generate-test.sh');
    const child = spawn('bash', [scriptPath, name], {
      stdio: 'inherit',
      env: { ...process.env, TEST_TYPE: options.type }
    });

    child.on('error', (err) => {
      console.error(chalk.red(` 생성 오류: ${err.message}`));
      process.exit(1);
    });
  });

// 설정 명령어
program
  .command('config')
  .alias('c')
  .description(chalk.cyan('설정 관리'))
  .option('-s, --set <key=value>', chalk.gray('설정 값 설정'))
  .option('-g, --get <key>', chalk.gray('설정 값 조회'))
  .option('-l, --list', chalk.gray('모든 설정 조회'))
  .action(async (options) => {
    console.log(LOGO);
    
    if (options.list) {
      console.log(chalk.blue('현재 설정:'));
      console.log(chalk.cyan(`API Key: ${process.env.GEMINI_API_KEY ? '설정됨' : '설정되지 않음'}`));
      console.log(chalk.cyan(`Node.js: ${process.version}`));
      console.log(chalk.cyan(`Platform: ${process.platform}`));
      return;
    }

    if (options.set) {
      const [key, value] = options.set.split('=');
      console.log(chalk.blue(`설정 업데이트: ${key} = ${value}`));
      // 실제로는 설정 파일에 저장하는 로직 필요
      return;
    }

    if (options.get) {
      console.log(chalk.blue(`설정 조회: ${options.get}`));
      // 실제로는 설정 파일에서 읽는 로직 필요
      return;
    }

    console.log(chalk.blue('설정 관리'));
    console.log(chalk.gray('사용법: debug-mate config --help'));
  });

// 상태 확인 명령어
program
  .command('status')
  .alias('s')
  .description(chalk.cyan('시스템 상태 확인'))
  .action(async () => {
    console.log(LOGO);
    
    console.log(chalk.blue('시스템 상태 확인 중...\n'));

    // 플랫폼 확인
    if (process.platform !== 'linux') {
      console.log(chalk.red(`플랫폼: ${process.platform} (Linux가 필요합니다)`));
      console.log(chalk.yellow('이 CLI는 Linux 환경에서만 실행할 수 있습니다.'));
      return;
    } else {
      console.log(chalk.green(`플랫폼: ${process.platform}`));
    }

    // 필수 도구 확인
    const tools = [
      { name: 'Node.js', command: 'node', version: process.version },
      { name: 'inotify-tools', command: 'inotifywait' },
      { name: 'GCC', command: 'gcc' },
      { name: 'tmux', command: 'tmux' }
    ];

    for (const tool of tools) {
      try {
        if (tool.command === 'node') {
          console.log(chalk.green(`${tool.name}: ${tool.version}`));
        } else if (tool.command === 'inotifywait') {
          // inotifywait가 설치되어 있는지만 확인
          execSync('which inotifywait', { encoding: 'utf8' });
          console.log(chalk.green(`${tool.name}: 설치됨`));
        } else {
          const version = execSync(`${tool.command} --version`, { encoding: 'utf8' }).split('\n')[0];
          console.log(chalk.green(`${tool.name}: ${version}`));
        }
      } catch (error) {
        console.log(chalk.red(` ${tool.name}: 설치되지 않음`));
        if (tool.command === 'tmux') {
          console.log(chalk.yellow('   설치: sudo apt install tmux'));
        } else if (tool.command === 'inotifywait') {
          console.log(chalk.yellow('   설치: sudo apt install inotify-tools'));
        } else if (tool.command === 'gcc') {
          console.log(chalk.yellow('   설치: sudo apt install build-essential'));
        }
      }
    }

    // API 키 확인
    console.log(chalk.cyan(`\n Gemini API Key: ${process.env.GEMINI_API_KEY ? '설정됨' : '설정되지 않음'}`));
    
    if (!process.env.GEMINI_API_KEY) {
      console.log(chalk.yellow(' API 키 설정: export GEMINI_API_KEY="your_key_here"'));
    }
  });

// 정보 명령어
program
  .command('info')
  .alias('i')
  .description(chalk.cyan('프로그램 정보'))
  .action(async () => {
    console.log(LOGO);
    
    console.log(chalk.blue('프로그램 정보:'));
    console.log(chalk.cyan(`Version: ${VERSION}`));
    console.log(chalk.cyan(`Node.js: ${process.version}`));
    console.log(chalk.cyan(`Platform: ${process.platform}`));
    console.log(chalk.cyan(`Architecture: ${process.arch}`));
    
    console.log(chalk.blue('\n링크:'));
    console.log(chalk.cyan(`GitHub: ${chalk.underline('https://github.com/zzmnxn/Debug_Mate')}`));
    console.log(chalk.cyan(`Issues: ${chalk.underline('https://github.com/zzmnxn/Debug_Mate/issues')}`));
    console.log(chalk.cyan(`NPM: ${chalk.underline('https://www.npmjs.com/package/@debugmate/cli')}`));
    
    console.log(chalk.blue('\n라이선스: MIT'));
    console.log(chalk.gray('Made with ❤️ by DebugMate Team'));
  });

// 기본 명령어 (파일명만 입력했을 때 - tmux 분할 화면이 기본)
program
  .argument('[file]', chalk.gray('디버깅할 C/C++ 파일'))
  .action(async (file) => {
    if (!file) {
      console.log(LOGO);
      console.log(chalk.yellow(' 사용법: debug-mate <파일명> 또는 debug-mate --help'));
      program.help();
      return;
    }

    console.log(LOGO);
    checkPlatform();
    
    if (!existsSync(file)) {
      console.log(chalk.yellow(` 파일이 존재하지 않습니다: ${file}`));
      console.log(chalk.blue('기본 C 템플릿을 생성하고 시작합니다...'));
    }
    
    await tmuxDebug(file);
  });

// 에러 처리
program.exitOverride();

try {
  program.parse();
} catch (err) {
  if (err.code === 'commander.help') {
    console.log(LOGO);
    console.log(chalk.blue('DebugMate CLI 도움말'));
    console.log(chalk.gray('C/C++ 코드를 AI로 분석하고 디버깅하는 도구입니다.'));
    console.log('');
    console.log(chalk.yellow('주요 명령어:'));
    console.log(chalk.cyan('  debug <file>     tmux 분할 화면으로 파일 감시 및 자동 디버깅'));
    console.log(chalk.cyan('  tmux <file>      tmux 분할 화면으로 디버깅 (debug와 동일)'));
    console.log(chalk.cyan('  generate [name]  테스트 코드 자동 생성'));
    console.log(chalk.cyan('  status           시스템 상태 확인'));
    console.log(chalk.cyan('  info             프로그램 정보'));
    console.log('');
    console.log(chalk.yellow('사용 예시:'));
    console.log(chalk.gray('  debug-mate debug test.c'));
    console.log(chalk.gray('  debug-mate generate my_test'));
    console.log(chalk.gray('  debug-mate status'));
    console.log('');
    console.log(chalk.yellow('자세한 도움말:'));
    console.log(chalk.gray('  debug-mate debug --help'));
    console.log(chalk.gray('  debug-mate generate --help'));
    console.log(chalk.gray('  debug-mate status --help'));
    console.log('');
    console.log(chalk.blue('더 많은 정보: https://github.com/zzmnxn/Debug_Mate'));
  } else {
    console.error(chalk.red(`오류: ${err.message}`));
    process.exit(1);
  }
}