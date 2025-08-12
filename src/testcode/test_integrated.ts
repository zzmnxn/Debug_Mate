import { testLoopCheck } from './test_loopCheck';
import { testTypoCheck, testRealCodeFile } from './test_typoCheck';
import { loopCheck } from '../agentica/handlers';
import * as fs from 'fs';
import * as path from 'path';

async function testSpecificLoopRequests() {
    console.log('=== 특정 반복문 요청 테스트 ===\n');
    
    try {
        const testCodePath = path.join(__dirname, 'test_loopCheck.c');
        const code = fs.readFileSync(testCodePath, 'utf-8');
        
        // "~번째 반복문 검사해줘" 형태의 요청 테스트
        console.log('1. "1번째 반복문 검사해줘" 요청:');
        const firstLoopResult = await loopCheck({ code, target: "1" });
        console.log(firstLoopResult.result);
        console.log('\n' + '='.repeat(50) + '\n');
        
        console.log('2. "15번째 반복문 검사해줘" 요청 (무한루프):');
        const fifteenthLoopResult = await loopCheck({ code, target: "15" });
        console.log(fifteenthLoopResult.result);
        console.log('\n' + '='.repeat(50) + '\n');
        
        console.log('3. "22번째 반복문 검사해줘" 요청 (do-while):');
        const doWhileLoopResult = await loopCheck({ code, target: "22" });
        console.log(doWhileLoopResult.result);
        
    } catch (error) {
        console.error('특정 반복문 요청 테스트 중 오류 발생:', error);
    }
}

async function testLoopComparisonRequests() {
    console.log('\n=== 반복문 비교 요청 테스트 ===\n');
    console.log('compareLoops 기능이 제거되었습니다.');
}

async function testEdgeCases() {
    console.log('\n=== 엣지 케이스 테스트 ===\n');
    
    try {
        const testCodePath = path.join(__dirname, 'test_loopCheck.c');
        const code = fs.readFileSync(testCodePath, 'utf-8');
        
        console.log('1. 존재하지 않는 반복문 번호 요청:');
        const invalidLoopResult = await loopCheck({ code, target: "999" });
        console.log(invalidLoopResult.result);
        console.log('\n' + '='.repeat(50) + '\n');
        
        console.log('2. 빈 타겟으로 비교 요청:');
        console.log('compareLoops 기능이 제거되었습니다.');
        console.log('\n' + '='.repeat(50) + '\n');
        
        console.log('3. 중복된 타겟으로 비교 요청:');
        console.log('compareLoops 기능이 제거되었습니다.');
        
    } catch (error) {
        console.error('엣지 케이스 테스트 중 오류 발생:', error);
    }
}

// 메인 통합 테스트 실행
async function runIntegratedTests() {
    console.log('🚀 통합 테스트 시작\n');
    
    // 기본 기능 테스트
    await testLoopCheck();
    await testTypoCheck();
    await testRealCodeFile();
    
    // 특정 요청 형태 테스트
    await testSpecificLoopRequests();
    await testLoopComparisonRequests();
    
    // 엣지 케이스 테스트
    await testEdgeCases();
    
    console.log('\n✅ 모든 통합 테스트 완료!');
}

if (require.main === module) {
    runIntegratedTests().catch(console.error);
}

export { 
    testSpecificLoopRequests, 
    testLoopComparisonRequests, 
    testEdgeCases,
    runIntegratedTests 
}; 