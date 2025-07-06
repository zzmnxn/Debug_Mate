import express, { Request, Response } from "express";
import cors from "cors";
import { ErrorDiagnosisService } from "./services/ErrorDiagnosisService";

const app = express();
const port = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 에러 진단 서비스 인스턴스
const errorDiagnosisService = new ErrorDiagnosisService();

// 에러 진단 API 엔드포인트
app.post("/api/diagnose", (req: Request, res: Response) => {
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
app.get("/api/diagnoses", (req: Request, res: Response) => {
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
app.get("/api/diagnoses/:id", (req: Request, res: Response) => {
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