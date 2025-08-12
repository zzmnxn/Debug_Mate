import { beforeDebug, inProgressDebug } from '../agentica/handlers';
import * as fs from 'fs';
import * as path from 'path';

// 오타가 포함된 테스트 코드
const codeWithTypos = `
#include <stdio.h>

int main() {
    int x = 10;
    int y = 20;
    
    // 오타들
    printf("x = %d\\n", x);  // 정상
    printf("y = %d\\n", y);  // 정상
    
    // 의도적인 오타들
    printf("x = %d\\n", x);  // 중복
    printf("z = %d\\n", z);  // 정의되지 않은 변수
    printf("x = %s\\n", x);  // 잘못된 포맷 지정자
    
    // 문법 오류들
    if (x == 10 {  // 괄호 누락
        printf("x is 10\\n");
    }
    
    for (int i = 0; i < 5; i++ {  // 괄호 누락
        printf("i = %d\\n", i);
    }
    
    return 0;
}
`;

async function testTypoCheck() {
    console.log('=== 오타 검사 테스트 ===\n');
    
    try {
        console.log('1. beforeDebug 테스트 (코드 분석):');
        const beforeDebugResult = await beforeDebug({ code: codeWithTypos });
        console.log(beforeDebugResult.result);
        console.log('\n' + '='.repeat(50) + '\n');
        
        console.log('2. inProgressDebug 테스트 (디버깅 중):');
        const inProgressResult = await inProgressDebug(codeWithTypos);
        console.log(inProgressResult.result);
        
    } catch (error) {
        console.error('오타 검사 테스트 중 오류 발생:', error);
    }
}

async function testRealCodeFile() {
    console.log('\n=== 실제 코드 파일 오타 검사 ===\n');
    
    try {
        const testCodePath = path.join(__dirname, 'test_loopCheck.c');
        const code = fs.readFileSync(testCodePath, 'utf-8');
        
        console.log('실제 테스트 코드 파일 분석:');
        const realCodeResult = await beforeDebug({ code });
        console.log(realCodeResult.result);
        
    } catch (error) {
        console.error('실제 코드 파일 테스트 중 오류 발생:', error);
    }
}

// 메인 테스트 실행
async function runTests() {
    await testTypoCheck();
    await testRealCodeFile();
}

if (require.main === module) {
    runTests().catch(console.error);
}

export { testTypoCheck, testRealCodeFile }; 