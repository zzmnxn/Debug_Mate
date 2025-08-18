#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve, basename } from 'path';
import { existsSync, writeFileSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const LOGO = `
${chalk.cyan.bold(`
══════════════════════════════════════════════════════════════
                                                               
   ${chalk.yellow.bold('DebugMate')} - C/C++ AI 디버깅 도구      
   ${chalk.gray('파일 감시 • 대화형 분석 • tmux 분할 화면')}       
                                                              
══════════════════════════════════════════════════════════════
`)}`;

// 버전 정보
const VERSION = '1.2.1';

// .env 파일 경로 - 사용자 홈 디렉토리에 생성
const ENV_FILE = join(process.env.HOME || process.env.USERPROFILE || process.cwd(), '.debug-mate.env');

// CLI 설정
const program = new Command();

// 기본 설정
program
  .name('debug-mate')
  .description(chalk.cyan('C/C++ 코드 분석을 위한 AI 기반 대화형 디버깅 도구'))
  .usage(chalk.yellow('<command> [options]'));

// .env 파일 생성 함수
function createEnvFile(apiKey) {
  const envContent = `# Gemini API 설정
GEMINI_API_KEY=${apiKey}
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent
`;
  
  try {
    // 디렉토리가 없으면 생성
    const envDir = dirname(ENV_FILE);
    if (!existsSync(envDir)) {
      console.log(chalk.gray(`디렉토리 생성 중: ${envDir}`));
      // mkdirSync는 이미 존재하는 디렉토리에 대해서는 에러를 발생시키지 않음
      try {
        require('fs').mkdirSync(envDir, { recursive: true });
      } catch (mkdirError) {
        console.error(chalk.red('디렉토리 생성 실패:', mkdirError.message));
        return false;
      }
    }
    
    writeFileSync(ENV_FILE, envContent, 'utf8');
    console.log(chalk.green(`환경 변수 파일 생성 완료: ${ENV_FILE}`));
    return true;
  } catch (error) {
    console.error(chalk.red('환경 변수 파일 생성 오류:', error.message));
    console.log(chalk.yellow('대안: 환경 변수로 직접 설정하세요:'));
    console.log(chalk.cyan(`  export GEMINI_API_KEY="${apiKey}"`));
    return false;
  }
}

// .env 파일에서 환경 변수 로드
function loadEnvFile() {
  try {
    if (existsSync(ENV_FILE)) {
      const envContent = readFileSync(ENV_FILE, 'utf8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, value] = trimmedLine.split('=');
          if (key && value) {
            process.env[key] = value;
          }
        }
      }
      console.log(chalk.gray(`환경 변수 파일 로드됨: ${ENV_FILE}`));
    } else {
      console.log(chalk.yellow(`환경 변수 파일이 없습니다: ${ENV_FILE}`));
    }
  } catch (error) {
    console.error(chalk.red('환경 변수 파일 읽기 오류:', error.message));
  }
}

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

// 의존성 체크 및 자동 설치 함수
async function checkAndInstallDependencies() {
  const dependencies = [
    { name: 'tmux', package: 'tmux', checkCmd: 'tmux -V' },
    { name: 'inotifywait', package: 'inotify-tools', checkCmd: 'which inotifywait' },
    { name: 'gcc', package: 'build-essential', checkCmd: 'gcc --version' },
    { name: 'python3', package: 'python3', checkCmd: 'python3 --version' },
    { name: 'make', package: 'make', checkCmd: 'make --version' }
  ];

  const missing = [];

  console.log(chalk.blue(' 필수 의존성 확인 중...'));

  for (const dep of dependencies) {
    try {
      execSync(dep.checkCmd, { encoding: 'utf8', stdio: 'ignore' });
      console.log(chalk.green(`✓ ${dep.name} 확인됨`));
    } catch {
      console.log(chalk.yellow(`⚠ ${dep.name} 없음`));
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    console.log(chalk.red(`\n ${missing.length}개의 필수 도구가 설치되지 않았습니다.`));
    console.log(chalk.blue('자동 설치를 시도합니다...\n'));

    try {
      // 패키지 목록 업데이트
      console.log(chalk.gray('패키지 목록 업데이트 중...'));
      execSync('sudo apt update', { stdio: 'inherit' });

      // 누락된 패키지들 설치
      const packages = missing.map(dep => dep.package).join(' ');
      console.log(chalk.gray(`설치 중: ${packages}`));
      execSync(`sudo apt install -y ${packages}`, { stdio: 'inherit' });

      console.log(chalk.green('\n 모든 의존성이 성공적으로 설치되었습니다!'));
    } catch (error) {
      console.error(chalk.red('\n 자동 설치에 실패했습니다.'));
      console.log(chalk.yellow('수동으로 다음 명령어를 실행해주세요:'));
      console.log(chalk.cyan(`  sudo apt update && sudo apt install -y ${missing.map(dep => dep.package).join(' ')}`));
      process.exit(1);
    }
  } else {
    console.log(chalk.green(' 모든 의존성이 준비되었습니다!\n'));
  }
}

// tmux 디버깅 함수
async function tmuxDebug(file, options = {}) {
  const { session, leftSize = 40 } = options;

  console.log(chalk.blue(`  tmux 분할 화면 모드 시작...`));
  console.log(chalk.gray(' 왼쪽: vi 편집기, 오른쪽: 자동 분석 실행(inprogress-run.ts)'));
  console.log(chalk.yellow(' 패널 간 이동: Ctrl+b + h(왼쪽) / l(오른쪽) / j(아래) / k(위)'));
  console.log(chalk.gray(' 종료는 tmux 세션 종료(Ctrl+b :kill-session 또는 별도 터미널에서 tmux kill-session -t <세션>)\n'));

  // 의존성 체크 및 자동 설치
  await checkAndInstallDependencies();

  // 파일 경로 정규화
  const filePath = resolve(file);
  const fileName = basename(file);

  // 세션명 안전화 (/, ., 공백, : → -)
  const cleanSession = (session || `dm-${fileName}`).replace(/[\/\.\s:]/g, '-');

  // 파일 없으면 기본 템플릿 생성
  const initSnippet = `
    TARGET_FILE="${filePath}"
    TARGET_DIR=$(dirname "$TARGET_FILE")
    
    # 디렉토리가 없으면 생성
    if [ ! -d "$TARGET_DIR" ]; then
      mkdir -p "$TARGET_DIR"
    fi
    
    # 파일이 없으면 기본 템플릿 생성
    if [ ! -f "$TARGET_FILE" ]; then
      cat > "$TARGET_FILE" <<'EOF'
#include <stdio.h>
int main(void){
  printf("Hello DebugMate!\\n");
  return 0;
}
EOF
      echo "기본 C 템플릿이 생성되었습니다: $TARGET_FILE"
    fi
    
    # 파일 권한 확인 및 수정
    chmod 644 "$TARGET_FILE"
  `;

  // 기존 세션 종료 시도(있으면 정리)
  try { execSync(`tmux kill-session -t "${cleanSession}" 2>/dev/null`); } catch {}

  // 오른쪽 패널에서 실행할 "저장 감시 + 분석" 파이프라인
  const rightPaneCmd = `bash "${__dirname}/watch-and-debug.sh" "${filePath}"`;

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
    tmux source-file "${__dirname}/.tmux.conf"

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

// 메인 디버깅 명령어 (tmux 분할 화면)
program
  .command('debug <file>')
  .alias('d')
  .description(chalk.cyan('tmux 분할 화면으로 파일 감시 및 자동 디버깅'))
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

// 테스트 코드 생성 명령어
program
  .command('generate [name]')
  .alias('g')
  .description(chalk.cyan('테스트 코드 자동 생성'))
  .option('-t, --type <type>', chalk.gray('테스트 타입 (1-9)'))
  .option('--list-types', chalk.gray('사용 가능한 테스트 타입 목록'))
  .action(async (name = 'test', options) => {
    console.log(LOGO);
    checkPlatform();

    if (options.listTypes) {
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

    // 의존성 체크 및 자동 설치
    await checkAndInstallDependencies();

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



// 의존성 체크 명령어
program
  .command('check-deps')
  .alias('cd')
  .description(chalk.cyan('의존성 체크 및 자동 설치'))
  .action(async () => {
    console.log(LOGO);
    checkPlatform();
    await checkAndInstallDependencies();
  });

// 상태 확인 명령어
program
  .command('status')
  .alias('s')
  .description(chalk.cyan('시스템 환경 및 의존성 상태 확인'))
  .option('-s, --set <key=value>', chalk.gray('API 키 설정 (예: --set KEY=your_api_key_here)'))
  .option('--quick', chalk.gray('빠른 상태 확인 (의존성 체크 생략)'))
  .action(async (options) => {
    console.log(LOGO);
    
    // API 키 설정 옵션이 있으면 처리
    if (options.set) {
      const [key, value] = options.set.split('=');
      if (key === 'KEY' && value) {
        // .env 파일 생성
        if (createEnvFile(value)) {
          console.log(chalk.green(`✓ API 키가 설정되었습니다.`));
          console.log(chalk.blue(`  .env 파일이 생성되었습니다: ${ENV_FILE}`));
          console.log(chalk.yellow('  참고: 이 설정은 영구적으로 저장됩니다.'));
          console.log('');
          
          // 환경 변수 로드
          loadEnvFile();
        } else {
          console.error(chalk.red('API 키 설정 실패'));
          return;
        }
      } else {
        console.error(chalk.red('올바른 형식: --set KEY=your_api_key_here'));
        return;
      }
    }
    
    console.log(chalk.blue('시스템 환경 및 의존성 상태 확인 중...\n'));

    // 플랫폼 확인
    if (process.platform !== 'linux') {
      console.log(chalk.red(`플랫폼: ${process.platform} (Linux가 필요합니다)`));
      console.log(chalk.yellow('이 CLI는 Linux 환경에서만 실행할 수 있습니다.'));
      console.log(chalk.blue('해결 방법:'));
      console.log(chalk.cyan('   1. WSL2 (Windows Subsystem for Linux) 사용'));
      console.log(chalk.cyan('   2. Linux 가상머신 사용'));
      console.log(chalk.cyan('   3. GitHub Codespaces 사용'));
      return;
    } else {
      console.log(chalk.green(`✓ 플랫폼: ${process.platform}`));
    }

    // Node.js 버전 표시
    console.log(chalk.green(`✓ Node.js: ${process.version}`));

    // 의존성 체크 (quick 옵션이 없을 때만)
    if (!options.quick) {
      console.log(chalk.blue('\n의존성 상태 확인 중...'));
      await checkAndInstallDependencies();
    } else {
      console.log(chalk.yellow('\n빠른 확인 모드: 의존성 체크 생략'));
    }

    // API 키 확인
    console.log(chalk.cyan(`\n Gemini API Key: ${process.env.GEMINI_API_KEY ? '설정됨' : '설정되지 않음'}`));
    console.log(chalk.cyan(` Gemini Base URL: ${process.env.GEMINI_BASE_URL ? '설정됨' : '설정되지 않음'}`));
    console.log(chalk.cyan(` 환경 변수 파일: ${ENV_FILE}`));
    
    if (!process.env.GEMINI_API_KEY) {
      console.log(chalk.yellow('\n API 키 설정 방법:'));
      console.log(chalk.cyan('   1. CLI 설정: ctrz status --set KEY=your_api_key_here'));
      console.log(chalk.cyan('   2. 환경변수: export GEMINI_API_KEY="your_api_key_here"'));
      console.log(chalk.cyan('   3. .env 파일 직접 생성: ~/.debug-mate.env'));
    } else {
      console.log(chalk.green('\n✓ API 키가 설정되어 있어 AI 분석 기능을 사용할 수 있습니다.'));
    }

    console.log(chalk.blue('\n시스템이 정상적으로 설정되었습니다!'));
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
    console.log(chalk.cyan(`NPM: ${chalk.underline('https://www.npmjs.com/package/ctrz')}`));
    
    console.log(chalk.blue('\n라이선스: MIT'));
    console.log(chalk.gray('Made with ❤️ by Ctr_Z Team'));
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

// 시작 시 .env 파일 로드
loadEnvFile();

// 커스텀 help와 version 처리
program
  .helpOption('-h, --help', chalk.gray('도움말 표시'))
  .version(chalk.green(`v${VERSION}`), '-v, --version');

// 기본 명령어가 없을 때 커스텀 help 표시
program
  .hook('preAction', (thisCommand) => {
    if (thisCommand.args.length === 0 && !thisCommand.parent) {
      console.log(LOGO);
      console.log(chalk.blue('DebugMate CLI 도움말'));
      console.log(chalk.gray('C/C++ 코드를 AI로 분석하고 디버깅하는 도구입니다.'));
      console.log('');
      console.log(chalk.yellow('주요 명령어:'));
      console.log(chalk.cyan('  debug <file>     tmux 분할 화면으로 파일 감시 및 자동 디버깅'));
      console.log(chalk.cyan('  generate [name]  테스트 코드 자동 생성'));
      console.log(chalk.cyan('  check-deps       의존성 체크 및 자동 설치'));
      console.log(chalk.cyan('  status           시스템 환경 및 의존성 상태 확인'));
      console.log(chalk.cyan('  info             프로그램 정보'));
      console.log('');
      console.log(chalk.yellow('사용 예시:'));
      console.log(chalk.gray('  ctrz debug test.c'));
      console.log(chalk.gray('  ctrz test.c              # 기본 명령어'));
      console.log(chalk.gray('  ctrz generate my_test'));
      console.log(chalk.gray('  ctrz status'));
      console.log('');
      console.log(chalk.yellow('API 키 설정:'));
      console.log(chalk.gray('  ctrz status --set KEY=your_api_key_here'));
      console.log(chalk.gray('  export GEMINI_API_KEY="your_api_key_here"'));
      console.log('');
      console.log(chalk.yellow('자세한 도움말:'));
      console.log(chalk.gray('  ctrz debug --help'));
      console.log(chalk.gray('  ctrz generate --help'));
      console.log(chalk.gray('  ctrz status --help'));
      console.log('');
      console.log(chalk.blue('더 많은 정보: https://github.com/zzmnxn/Debug_Mate'));
      process.exit(0);
    }
  });

// 에러 처리
try {
  program.parse();
} catch (err) {
  console.error(chalk.red(`오류: ${err.message}`));
  process.exit(1);
}