const { LoopAnalysisService } = require('./lib/core/LoopAnalysisService');
const { AnalysisService } = require('./lib/core/AnalysisService');
const { CodeUtils } = require('./lib/utils/CodeUtils');
const fs = require('fs');

async function testComprehensive() {
    console.log('🚀 포괄적인 리팩토링 구조 테스트 시작\n');

    try {
        // test.c 파일 읽기 (변수 분석용)
        const testCode = fs.readFileSync('./test.c', 'utf8');
        console.log('📁 test.c 파일을 성공적으로 읽었습니다.\n');

        // test_loop.c 파일 읽기 (루프 분석용)
        const loopCode = fs.readFileSync('./test_loop.c', 'utf8');
        console.log('📁 test_loop.c 파일을 성공적으로 읽었습니다.\n');

        // 1. CodeUtils 테스트
        console.log('1️⃣ CodeUtils 테스트...');
        const loops = CodeUtils.extractLoops(loopCode);
        console.log('발견된 루프 수:', loops.length);
        loops.forEach((loop, index) => {
            console.log(`  ${index + 1}번째 루프: ${loop.type} (${loop.startLine}-${loop.endLine}줄)`);
        });

        const variables = CodeUtils.extractVariables(loopCode);
        console.log('발견된 변수:', variables);
        console.log('');

        // 2. LoopAnalysisService 테스트
        console.log('2️⃣ LoopAnalysisService 테스트...');
        const loopAnalysisService = new LoopAnalysisService();
        const loopAnalysis = await loopAnalysisService.analyzeLoops(loopCode, "루프 분석해줘");
        console.log('루프 분석 결과:', loopAnalysis.substring(0, 150) + '...');
        console.log('');

        // 3. AnalysisService 변수 추적 테스트
        console.log('3️⃣ AnalysisService 변수 추적 테스트...');
        const analysisService = new AnalysisService();
        const variableAnalysis = await analysisService.traceVariables(testCode, "변수 사용을 분석해줘");
        console.log('변수 분석 결과:', variableAnalysis.substring(0, 150) + '...');
        console.log('');

        // 4. 무한 루프 위험성 검사
        console.log('4️⃣ 무한 루프 위험성 검사...');
        const infiniteLoopCheck = await loopAnalysisService.detectInfiniteLoops(loopCode);
        console.log('무한 루프 위험:', infiniteLoopCheck.hasInfiniteRisk ? '있음' : '없음');
        if (infiniteLoopCheck.riskLoops.length > 0) {
            console.log('위험한 루프:', infiniteLoopCheck.riskLoops.length, '개');
        }
        console.log('');

        console.log('✅ 포괄적인 리팩토링 구조 테스트 완료!');
        
    } catch (error) {
        console.error('❌ 테스트 중 오류 발생:', error.message);
        console.error(error.stack);
    }
}

// 테스트 실행
testComprehensive();
