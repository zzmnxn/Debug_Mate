import * as readline from 'readline';

export function printBanner(title: string) {
  console.log('\n================================');
  console.log(`  *   ${title}   *  `);
  console.log('================================\n');
}

export function printSection() {
  console.log('\n================================\n');
}

export function println(msg: string) {
  process.stdout.write(String(msg) + '\n');
}

/**
 * 단발 질문 프롬프트. TTY가 아닐 경우 빈 문자열 반환.
 */
export async function promptOnce(question: string): Promise<string> {
  if (!process.stdin.isTTY) return '';
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (line) => {
      rl.close();
      resolve((line ?? '').trim());
    });
  });
}
