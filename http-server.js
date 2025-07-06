const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 에러 진단 서비스 (간단한 버전)
class ErrorDiagnosisService {
  constructor() {
    this.diagnoses = [];
  }

  diagnoseError(props) {
    const { input } = props;
    const output = input.compilerOutput.toLowerCase();
    
    let diagnosis = {
      summary: "알 수 없는 오류가 발생했습니다.",
      errorType: "Unknown Error",
      solution: "오류 로그를 분석하여 문제를 파악하세요.",
      severity: "critical"
    };

    // TypeScript 오류 분석
    if (output.includes("typescript") || output.includes("tsc") || output.includes("ts2304") || output.includes("cannot find name") || output.includes("error ts2304")) {
      if (output.includes("cannot find name") || output.includes("ts2304")) {
        diagnosis = {
          summary: "정의되지 않은 변수나 함수를 사용했습니다.",
          errorType: "Undefined Variable",
          solution: "변수나 함수를 선언하거나 올바른 import 문을 추가하세요.",
          severity: "medium"
        };
      } else if (output.includes("type") && output.includes("is not assignable")) {
        diagnosis = {
          summary: "타입 불일치 오류가 발생했습니다.",
          errorType: "Type Mismatch",
          solution: "변수의 타입을 확인하고 올바른 타입으로 수정하세요.",
          severity: "medium"
        };
      }
    }
    
    // Python 오류 분석
    if (output.includes("python") || output.includes("syntaxerror")) {
      if (output.includes("syntaxerror") || output.includes("invalid syntax")) {
        diagnosis = {
          summary: "Python 구문 오류가 발생했습니다. 괄호나 콜론이 누락되었을 수 있습니다.",
          errorType: "Syntax Error",
          solution: "괄호, 콜론, 들여쓰기 등을 확인하고 구문을 수정하세요.",
          severity: "medium"
        };
      } else if (output.includes("indentationerror")) {
        diagnosis = {
          summary: "Python 들여쓰기 오류가 발생했습니다.",
          errorType: "Indentation Error",
          solution: "일관된 들여쓰기를 사용하고 탭과 스페이스를 혼용하지 마세요.",
          severity: "low"
        };
      }
    }

    const result = {
      id: Date.now().toString(),
      originalOutput: input.compilerOutput,
      diagnosis: diagnosis.summary,
      errorType: diagnosis.errorType,
      solution: diagnosis.solution,
      severity: diagnosis.severity,
      filePath: input.filePath,
      language: input.language,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.diagnoses.push(result);
    return result;
  }

  index() {
    return this.diagnoses;
  }

  show(props) {
    const diagnosis = this.diagnoses.find(d => d.id === props.id);
    if (!diagnosis) {
      throw new Error("진단 기록을 찾을 수 없습니다.");
    }
    return diagnosis;
  }
}

// 에러 진단 서비스 인스턴스
const errorDiagnosisService = new ErrorDiagnosisService();

// 에러 진단 API 엔드포인트
app.post("/api/diagnose", (req, res) => {
  try {
    const { compilerOutput, filePath, language } = req.body;
    
    if (!compilerOutput) {
      return res.status(400).json({
        error: "compilerOutput는 필수입니다."
      });
    }

    const result = errorDiagnosisService.diagnoseError({
      input: {
        compilerOutput,
        filePath,
        language
      }
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("에러 진단 중 오류 발생:", error);
    res.status(500).json({
      error: "서버 내부 오류가 발생했습니다."
    });
  }
});

// 모든 진단 기록 조회
app.get("/api/diagnoses", (req, res) => {
  try {
    const diagnoses = errorDiagnosisService.index();
    res.json({
      success: true,
      data: diagnoses
    });
  } catch (error) {
    console.error("진단 기록 조회 중 오류 발생:", error);
    res.status(500).json({
      error: "서버 내부 오류가 발생했습니다."
    });
  }
});

// 특정 진단 기록 조회
app.get("/api/diagnoses/:id", (req, res) => {
  try {
    const { id } = req.params;
    const diagnosis = errorDiagnosisService.show({ id });
    res.json({
      success: true,
      data: diagnosis
    });
  } catch (error) {
    console.error("진단 기록 조회 중 오류 발생:", error);
    res.status(404).json({
      error: "진단 기록을 찾을 수 없습니다."
    });
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`🚀 HTTP 서버가 포트 ${port}에서 시작됩니다...`);
  console.log(`📋 사용 가능한 엔드포인트:`);
  console.log(`   POST /api/diagnose - 에러 진단`);
  console.log(`   GET  /api/diagnoses - 모든 진단 기록`);
  console.log(`   GET  /api/diagnoses/:id - 특정 진단 기록`);
}); 