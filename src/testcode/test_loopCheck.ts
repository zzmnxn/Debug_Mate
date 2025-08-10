import { loopCheck, compareLoops } from '../agentica/handlers';
import * as fs from 'fs';
import * as path from 'path';

async function testLoopCheck() {
    console.log('=== 반복문 검사 테스트 ===\n');
    
    try {
        // 테스트 코드 파일 읽기
        const testCodePath = path.join(__dirname, 'test_loopCheck.c');
        const code = fs.readFileSync(testCodePath, 'utf-8');
        
        console.log('1. 전체 반복문 검사:');
        const allLoopsResult = await loopCheck({ code, target: "all" });
        console.log(allLoopsResult.result);
        console.log('\n' + '='.repeat(50) + '\n');
        
        console.log('2. 특정 반복문 검사 (1번째):');
        const firstLoopResult = await loopCheck({ code, target: "1" });
        console.log(firstLoopResult.result);
        console.log('\n' + '='.repeat(50) + '\n');
        
        console.log('3. 특정 반복문 검사 (15번째 - 무한루프):');
        const infiniteLoopResult = await loopCheck({ code, target: "15" });
        console.log(infiniteLoopResult.result);
        console.log('\n' + '='.repeat(50) + '\n');
        
        console.log('4. 반복문 비교 (1번째와 15번째):');
        const compareResult = await compareLoops({ 
            code, 
            targets: ["1", "15"] 
        });
        console.log(compareResult.result);
        
    } catch (error) {
        console.error('테스트 중 오류 발생:', error);
    }
}

async function testCompareLoops() {
    console.log('\n=== 반복문 비교 테스트 ===\n');
    
    try {
        const testCodePath = path.join(__dirname, 'test_loopCheck.c');
        const code = fs.readFileSync(testCodePath, 'utf-8');
        
        console.log('1. 중첩 반복문 비교 (14번째와 15번째):');
        const nestedCompareResult = await compareLoops({ 
            code, 
            targets: ["14", "15"] 
        });
        console.log(nestedCompareResult.result);
        console.log('\n' + '='.repeat(50) + '\n');
        
        console.log('2. 여러 반복문 비교 (1, 2, 3번째):');
        const multiCompareResult = await compareLoops({ 
            code, 
            targets: ["1", "2", "3"] 
        });
        console.log(multiCompareResult.result);
        
    } catch (error) {
        console.error('비교 테스트 중 오류 발생:', error);
    }
}

// 메인 테스트 실행
async function runTests() {
    await testLoopCheck();
    await testCompareLoops();
}

if (require.main === module) {
    runTests().catch(console.error);
}

export { testLoopCheck, testCompareLoops }; 