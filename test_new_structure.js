const { DebugService } = require('./lib/core/DebugService');
const { CompilationService } = require('./lib/core/CompilationService');
const { AnalysisService } = require('./lib/core/AnalysisService');
const fs = require('fs');

async function testNewStructure() {
    console.log('🚀 새로운 리팩토링 구조 테스트 시작\n');

    try {
        // test.c 파일 읽기
        const testCode = fs.readFileSync('./test.c', 'utf8');
        console.log('📁 test.c 파일을 성공적으로 읽었습니다.\n');

        // 새로운 서비스들 테스트
        console.log('1️⃣ CompilationService 테스트...');
        const compilationService = new CompilationService();
        const compileResult = await compilationService.compileCode(testCode);
        console.log('컴파일 결과:', compileResult.success ? '성공' : '실패');
        if (!compileResult.success) {
            console.log('오류:', compileResult.errors.map(e => e.message));
        }
        console.log('');

        console.log('2️⃣ AnalysisService 테스트...');
        const analysisService = new AnalysisService();
        const analysis = await analysisService.analyzeCompilationResult(compileResult);
        console.log('분석 결과:', analysis.substring(0, 100) + '...');
        console.log('');

        console.log('3️⃣ DebugService 테스트...');
        const debugService = new DebugService();
        const beforeDebugResult = await debugService.beforeDebug({ code: testCode });
        console.log('beforeDebug 결과:', beforeDebugResult.substring(0, 100) + '...');
        console.log('');

        console.log('✅ 새로운 리팩토링 구조 테스트 완료!');
        
    } catch (error) {
        console.error('❌ 테스트 중 오류 발생:', error.message);
        console.error(error.stack);
    }
}

// 테스트 실행
testNewStructure();
