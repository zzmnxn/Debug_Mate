#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ASCII 아트 로고
const LOGO = `
${chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║  ${chalk.yellow.bold('DebugMate')} - C/C++ AI 디버깅 도구                    ║
║  ${chalk.gray('파일 감시 • 대화형 분석 • tmux 분할 화면')}              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
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
    console.error(chalk.red('❌ 이 CLI는 Linux 환경에서만 실행할 수 있습니다.'));
    console.log(chalk.yellow('💡 현재 플랫폼: ' + process.platform));
    console.log(chalk.blue('📋 해결 방법:'));
    console.log(chalk.cyan('   1. WSL2 (Windows Subsystem for Linux) 사용'));
    console.log(chalk.cyan('   2. Linux 가상머신 사용'));
    console.log(chalk.cyan('   3. GitHub Codespaces 사용'));
    console.log(chalk.gray('   자세한 내용: https://github.com/zzmnxn/Debug_Mate#readme'));
    process.exit(1);
  }
}

// tmux 분할 화면 함수 (기본 디버깅 모드)
async function tmuxDebug(file, options = {}) {
  const { session, leftSize = 60 } = options;
  
  console.log(chalk.blue(`🖥️  tmux 분할 화면 모드 시작...`));
  console.log(chalk.gray('📝 왼쪽: 파일 편집, 오른쪽: 디버깅 결과'));
  console.log(chalk.gray('🛑 종료하려면 tmux 세션을 종료하세요.\n'));

  // tmux 설치 확인
  try {
    const tmuxVersion = execSync('tmux -V', { encoding: 'utf8' }).trim();
    console.log(chalk.green(`✅ tmux 감지됨: ${tmuxVersion}`));
  } catch (error) {
    console.error(chalk.red('❌ tmux가 설치되지 않았습니다.'));
    console.log(chalk.yellow('💡 설치 명령어: sudo apt install tmux'));
    console.log(chalk.blue('📋 전체 시스템 요구사항:'));
    console.log(chalk.cyan('   sudo apt update'));
    console.log(chalk.cyan('   sudo apt install -y tmux inotify-tools gcc g++ build-essential python3 make'));
    process.exit(1);
  }

  // tmux 세션 이름
  const sessionName = session || `debug-mate-${file.replace('.c', '')}`;

  // 기존 세션이 있으면 종료
  try {
    execSync(`tmux kill-session -t "${sessionName}" 2>/dev/null`, { stdio: 'ignore' });
  } catch (error) {
    // 세션이 없으면 무시
  }

  // 개발 환경에서는 ts-node 사용, 프로덕션에서는 컴파일된 JS 사용
  let distEntry;
  if (existsSync(join(__dirname, 'lib/agentica/inprogress-run.js'))) {
    distEntry = 'lib/agentica/inprogress-run.js';
  } else if (existsSync(join(__dirname, 'dist/agentica/inprogress-run.js'))) {
    distEntry = 'dist/agentica/inprogress-run.js';
  } else {
    distEntry = 'ts-node src/agentica/inprogress-run.ts';
  }

  // tmux 스크립트 구성
  const tmuxScript = `
    # 새 tmux 세션 생성
    tmux new-session -d -s "${sessionName}" -n "editor"

    # 왼쪽 패널: 파일 편집 안내
    tmux send-keys -t "${sessionName}:editor" "echo '=== 파일 편집 ==='" Enter
    tmux send-keys -t "${sessionName}:editor" "echo '파일을 편집하고 저장하면 자동으로 디버깅이 실행됩니다.'" Enter
    tmux send-keys -t "${sessionName}:editor" "echo 'Ctrl+C로 종료'" Enter
    tmux send-keys -t "${sessionName}:editor" "echo ''" Enter

    # 파일이 없으면 기본 템플릿 생성
    if [ ! -f "${file}" ]; then
      cat > "${file}" << 'EOF'
#include <stdio.h>

int main() {
    int i;
    for (i = 0; i < 5; i++) {
        printf("Hello, World! %d\\n", i);
    }
    return 0;
}
EOF
      tmux send-keys -t "${sessionName}:editor" "echo '기본 템플릿 파일이 생성되었습니다: ${file}'" Enter
    fi

    # 오른쪽 패널 생성 (디버깅 결과)
    tmux split-window -h -t "${sessionName}:editor"

    # 오른쪽 패널: 디버깅 결과
    tmux send-keys -t "${sessionName}:editor.1" "echo '=== 디버깅 결과 ==='" Enter
    tmux send-keys -t "${sessionName}:editor.1" "echo '파일 저장을 기다리는 중...'" Enter
    tmux send-keys -t "${sessionName}:editor.1" "echo ''" Enter

    # 파일 감시 시작 (오른쪽 패널에서)
    tmux send-keys -t "${sessionName}:editor.1" "cd '${__dirname}'" Enter
    tmux send-keys -t "${sessionName}:editor.1" "echo '파일 감시 시작...'" Enter

    # inotifywait로 파일 감시
    tmux send-keys -t "${sessionName}:editor.1" "inotifywait -m -e close_write --format '%w%f' '${file}' | while IFS= read -r FULLPATH; do" Enter
    tmux send-keys -t "${sessionName}:editor.1" "  echo '=== 저장됨: \$FULLPATH ==='" Enter
    tmux send-keys -t "${sessionName}:editor.1" "  echo 'BeforeDebug 실행 중...'" Enter
    ${distEntry.includes('ts-node') ? 
      `tmux send-keys -t "${sessionName}:editor.1" "  (cd '${__dirname}' && npx ${distEntry} \"\$FULLPATH\" < /dev/tty)" Enter` :
      `tmux send-keys -t "${sessionName}:editor.1" "  (cd '${__dirname}' && node ${distEntry} \"\$FULLPATH\" < /dev/tty)" Enter`
    }
    tmux send-keys -t "${sessionName}:editor.1" "  echo '=== 실행 완료 ==='" Enter
    tmux send-keys -t "${sessionName}:editor.1" "  echo ''" Enter
    tmux send-keys -t "${sessionName}:editor.1" "done" Enter

    # 패널 크기 조정
    tmux resize-pane -t "${sessionName}:editor.0" -x ${leftSize}

    # 세션에 연결
    echo "tmux 세션 '${sessionName}'이 시작되었습니다."
    echo "왼쪽: 파일 편집, 오른쪽: 디버깅 결과"
    echo "종료하려면: tmux kill-session -t ${sessionName}"
    echo ""
    echo "세션에 연결 중..."

    tmux attach-session -t "${sessionName}"
  `;

  const child = spawn('bash', ['-c', tmuxScript], {
    stdio: 'inherit',
    env: { ...process.env }
  });

  child.on('error', (err) => {
    console.error(chalk.red(`❌ tmux 실행 오류: ${err.message}`));
    console.log(chalk.yellow('💡 tmux가 설치되어 있는지 확인하세요: sudo apt install tmux'));
    process.exit(1);
  });
}

// 기본 디버깅 명령어 (tmux 분할 화면이 기본)
program
  .command('debug <file>')
  .alias('d')
  .description(chalk.cyan('tmux 분할 화면으로 파일 감시 및 자동 디버깅'))
  .option('-s, --session <name>', chalk.gray('tmux 세션 이름 지정'))
  .option('-l, --left <percent>', chalk.gray('왼쪽 패널 크기 (기본: 60%)'), '60')
  .option('-t, --timeout <ms>', chalk.gray('타임아웃 설정 (기본: 30000ms)'), '30000')
  .action(async (file, options) => {
    console.log(LOGO);
    checkPlatform();
    
    if (!existsSync(file)) {
      console.error(chalk.red(`❌ 파일을 찾을 수 없습니다: ${file}`));
      process.exit(1);
    }

    await tmuxDebug(file, options);
  });

// tmux 분할 화면 명령어 (별도 옵션으로 유지)
program
  .command('tmux <file>')
  .alias('t')
  .description(chalk.cyan('tmux 분할 화면으로 디버깅 (debug 명령어와 동일)'))
  .option('-s, --session <name>', chalk.gray('tmux 세션 이름 지정'))
  .option('-l, --left <percent>', chalk.gray('왼쪽 패널 크기 (기본: 60%)'), '60')
  .action(async (file, options) => {
    console.log(LOGO);
    checkPlatform();
    
    if (!existsSync(file)) {
      console.error(chalk.red(`❌ 파일을 찾을 수 없습니다: ${file}`));
      process.exit(1);
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
      console.log(chalk.blue('📋 사용 가능한 테스트 타입:'));
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

    console.log(chalk.blue(`🧪 테스트 코드 생성 중...`));
    console.log(chalk.gray(`📁 파일명: ${name}.c`));

    // generate-test.sh 스크립트 호출
    const scriptPath = join(__dirname, 'generate-test.sh');
    const child = spawn('bash', [scriptPath, name], {
      stdio: 'inherit',
      env: { ...process.env, TEST_TYPE: options.type }
    });

    child.on('error', (err) => {
      console.error(chalk.red(`❌ 생성 오류: ${err.message}`));
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
      console.log(chalk.blue('⚙️  현재 설정:'));
      console.log(chalk.cyan(`API Key: ${process.env.GEMINI_API_KEY ? '✅ 설정됨' : '❌ 설정되지 않음'}`));
      console.log(chalk.cyan(`Node.js: ${process.version}`));
      console.log(chalk.cyan(`Platform: ${process.platform}`));
      return;
    }

    if (options.set) {
      const [key, value] = options.set.split('=');
      console.log(chalk.blue(`🔧 설정 업데이트: ${key} = ${value}`));
      // 실제로는 설정 파일에 저장하는 로직 필요
      return;
    }

    if (options.get) {
      console.log(chalk.blue(`🔍 설정 조회: ${options.get}`));
      // 실제로는 설정 파일에서 읽는 로직 필요
      return;
    }

    console.log(chalk.blue('⚙️  설정 관리'));
    console.log(chalk.gray('사용법: debug-mate config --help'));
  });

// 상태 확인 명령어
program
  .command('status')
  .alias('s')
  .description(chalk.cyan('시스템 상태 확인'))
  .action(async () => {
    console.log(LOGO);
    
    console.log(chalk.blue('🔍 시스템 상태 확인 중...\n'));

    // 플랫폼 확인
    if (process.platform !== 'linux') {
      console.log(chalk.red(`❌ 플랫폼: ${process.platform} (Linux가 필요합니다)`));
      console.log(chalk.yellow('💡 이 CLI는 Linux 환경에서만 실행할 수 있습니다.'));
      return;
    } else {
      console.log(chalk.green(`✅ 플랫폼: ${process.platform}`));
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
          console.log(chalk.green(`✅ ${tool.name}: ${tool.version}`));
        } else {
          const version = execSync(`${tool.command} --version`, { encoding: 'utf8' }).split('\n')[0];
          console.log(chalk.green(`✅ ${tool.name}: ${version}`));
        }
      } catch (error) {
        console.log(chalk.red(`❌ ${tool.name}: 설치되지 않음`));
        if (tool.command === 'tmux') {
          console.log(chalk.yellow('   💡 설치: sudo apt install tmux'));
        } else if (tool.command === 'inotifywait') {
          console.log(chalk.yellow('   💡 설치: sudo apt install inotify-tools'));
        } else if (tool.command === 'gcc') {
          console.log(chalk.yellow('   💡 설치: sudo apt install build-essential'));
        }
      }
    }

    // API 키 확인
    console.log(chalk.cyan(`\n🔑 Gemini API Key: ${process.env.GEMINI_API_KEY ? '✅ 설정됨' : '❌ 설정되지 않음'}`));
    
    if (!process.env.GEMINI_API_KEY) {
      console.log(chalk.yellow('💡 API 키 설정: export GEMINI_API_KEY="your_key_here"'));
    }
  });

// 정보 명령어
program
  .command('info')
  .alias('i')
  .description(chalk.cyan('프로그램 정보'))
  .action(async () => {
    console.log(LOGO);
    
    console.log(chalk.blue('📊 프로그램 정보:'));
    console.log(chalk.cyan(`Version: ${VERSION}`));
    console.log(chalk.cyan(`Node.js: ${process.version}`));
    console.log(chalk.cyan(`Platform: ${process.platform}`));
    console.log(chalk.cyan(`Architecture: ${process.arch}`));
    
    console.log(chalk.blue('\n🔗 링크:'));
    console.log(chalk.cyan(`GitHub: ${chalk.underline('https://github.com/zzmnxn/Debug_Mate')}`));
    console.log(chalk.cyan(`Issues: ${chalk.underline('https://github.com/zzmnxn/Debug_Mate/issues')}`));
    console.log(chalk.cyan(`NPM: ${chalk.underline('https://www.npmjs.com/package/@debugmate/cli')}`));
    
    console.log(chalk.blue('\n📝 라이선스: MIT'));
    console.log(chalk.gray('Made with ❤️ by DebugMate Team'));
  });

// 기본 명령어 (파일명만 입력했을 때 - tmux 분할 화면이 기본)
program
  .argument('[file]', chalk.gray('디버깅할 C/C++ 파일'))
  .action(async (file) => {
    if (!file) {
      console.log(LOGO);
      console.log(chalk.yellow('💡 사용법: debug-mate <파일명> 또는 debug-mate --help'));
      program.help();
      return;
    }

    console.log(LOGO);
    checkPlatform();
    await tmuxDebug(file);
  });

// 에러 처리
program.exitOverride();

try {
  program.parse();
} catch (err) {
  if (err.code === 'commander.help') {
    console.log(LOGO);
    console.log(chalk.blue('📖 DebugMate CLI 도움말'));
    console.log(chalk.gray('C/C++ 코드를 AI로 분석하고 디버깅하는 도구입니다.'));
    console.log('');
    console.log(chalk.yellow('🔧 주요 명령어:'));
    console.log(chalk.cyan('  debug <file>     tmux 분할 화면으로 파일 감시 및 자동 디버깅'));
    console.log(chalk.cyan('  tmux <file>      tmux 분할 화면으로 디버깅 (debug와 동일)'));
    console.log(chalk.cyan('  generate [name]  테스트 코드 자동 생성'));
    console.log(chalk.cyan('  status           시스템 상태 확인'));
    console.log(chalk.cyan('  info             프로그램 정보'));
    console.log('');
    console.log(chalk.yellow('💡 사용 예시:'));
    console.log(chalk.gray('  debug-mate debug test.c'));
    console.log(chalk.gray('  debug-mate generate my_test'));
    console.log(chalk.gray('  debug-mate status'));
    console.log('');
    console.log(chalk.yellow('📋 자세한 도움말:'));
    console.log(chalk.gray('  debug-mate debug --help'));
    console.log(chalk.gray('  debug-mate generate --help'));
    console.log(chalk.gray('  debug-mate status --help'));
    console.log('');
    console.log(chalk.blue('🔗 더 많은 정보: https://github.com/zzmnxn/Debug_Mate'));
  } else {
    console.error(chalk.red(`❌ 오류: ${err.message}`));
    process.exit(1);
  }
}
