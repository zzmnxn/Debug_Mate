import { tags } from "typia";
import { v4 } from "uuid";

import { IErrorDiagnosis } from "../structures/IErrorDiagnosis";

export class ErrorDiagnosisService {
  private readonly diagnoses: IErrorDiagnosis[] = [];

  /**
   * 컴파일러 출력을 분석하여 오류를 진단합니다.
   *
   * 컴파일러나 인터프리터의 출력 로그를 받아서 오류의 원인을 분석하고
   * 개발자가 이해하기 쉬운 형태로 요약하여 제공합니다.
   *
   * @param props 진단 요청 속성
   * @returns 진단된 오류 정보
   */
  public diagnoseError(props: {
    /**
     * 컴파일러 출력 로그
     */
    input: IErrorDiagnosis.ICreate;
  }): IErrorDiagnosis {
    console.log("🔍 에러 진단 요청 받음:", JSON.stringify(props, null, 2));
    const diagnosis = this.analyzeCompilerOutput(props.input);
    console.log("📋 진단 결과:", JSON.stringify(diagnosis, null, 2));
    
    const errorDiagnosis: IErrorDiagnosis = {
      id: v4(),
      originalOutput: props.input.compilerOutput,
      diagnosis: diagnosis.summary,
      errorType: diagnosis.errorType,
      solution: diagnosis.solution,
      severity: diagnosis.severity,
      filePath: props.input.filePath,
      language: props.input.language,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    this.diagnoses.push(errorDiagnosis);
    return errorDiagnosis;
  }

  /**
   * 모든 진단 기록을 조회합니다.
   *
   * @returns 진단 기록 목록
   */
  public index(): IErrorDiagnosis[] {
    return this.diagnoses;
  }

  /**
   * 특정 진단 기록을 조회합니다.
   *
   * @param props 조회 속성
   * @returns 진단 기록
   */
  public show(props: {
    /**
     * 조회할 진단 기록의 ID
     */
    id: string & tags.Format<"uuid">;
  }): IErrorDiagnosis {
    const diagnosis = this.diagnoses.find((d) => d.id === props.id);
    if (!diagnosis) {
      throw new Error("진단 기록을 찾을 수 없습니다.");
    }
    return diagnosis;
  }

  /**
   * 진단 기록을 업데이트합니다.
   *
   * @param props 업데이트 속성
   */
  public update(props: {
    /**
     * 업데이트할 진단 기록의 ID
     */
    id: string & tags.Format<"uuid">;
    
    /**
     * 업데이트할 내용
     */
    input: IErrorDiagnosis.IUpdate;
  }): void {
    const diagnosis = this.diagnoses.find((d) => d.id === props.id);
    if (!diagnosis) {
      throw new Error("업데이트할 진단 기록을 찾을 수 없습니다.");
    }

    if (props.input.diagnosis !== undefined) {
      diagnosis.diagnosis = props.input.diagnosis;
    }
    if (props.input.errorType !== undefined) {
      diagnosis.errorType = props.input.errorType;
    }
    if (props.input.solution !== undefined) {
      diagnosis.solution = props.input.solution;
    }
    if (props.input.severity !== undefined) {
      diagnosis.severity = props.input.severity;
    }
    
    diagnosis.updated_at = new Date().toISOString();
  }

  /**
   * 진단 기록을 삭제합니다.
   *
   * @param props 삭제 속성
   */
  public erase(props: {
    /**
     * 삭제할 진단 기록의 ID
     */
    id: string & tags.Format<"uuid">;
  }): void {
    const index = this.diagnoses.findIndex((d) => d.id === props.id);
    if (index === -1) {
      throw new Error("삭제할 진단 기록을 찾을 수 없습니다.");
    }
    this.diagnoses.splice(index, 1);
  }

  /**
   * 컴파일러 출력을 분석하여 오류 정보를 추출합니다.
   *
   * @param input 컴파일러 출력 정보
   * @returns 분석된 오류 정보
   */
  private analyzeCompilerOutput(input: IErrorDiagnosis.ICreate): {
    summary: string;
    errorType: string;
    solution: string;
    severity: "low" | "medium" | "high" | "critical";
  } {
    const output = input.compilerOutput.toLowerCase();
    
    // TypeScript/JavaScript 오류 패턴 분석
    if (output.includes("typescript") || output.includes("tsc")) {
      return this.analyzeTypeScriptError(output);
    }
    
    // Python 오류 패턴 분석
    if (output.includes("python") || output.includes("syntaxerror") || output.includes("indentationerror")) {
      return this.analyzePythonError(output);
    }
    
    // C/C++ 오류 패턴 분석
    if (output.includes("gcc") || output.includes("g++") || output.includes("clang")) {
      return this.analyzeCppError(output);
    }
    
    // Java 오류 패턴 분석
    if (output.includes("javac") || output.includes("java.lang")) {
      return this.analyzeJavaError(output);
    }
    
    // 일반적인 오류 패턴 분석
    return this.analyzeGenericError(output);
  }

  private analyzeTypeScriptError(output: string): {
    summary: string;
    errorType: string;
    solution: string;
    severity: "low" | "medium" | "high" | "critical";
  } {
    if (output.includes("cannot find name")) {
      return {
        summary: "정의되지 않은 변수나 함수를 사용했습니다.",
        errorType: "Undefined Variable",
        solution: "변수나 함수를 선언하거나 올바른 import 문을 추가하세요.",
        severity: "medium"
      };
    }
    
    if (output.includes("type") && output.includes("is not assignable")) {
      return {
        summary: "타입 불일치 오류가 발생했습니다.",
        errorType: "Type Mismatch",
        solution: "변수의 타입을 확인하고 올바른 타입으로 수정하세요.",
        severity: "medium"
      };
    }
    
    if (output.includes("property") && output.includes("does not exist")) {
      return {
        summary: "존재하지 않는 속성에 접근했습니다.",
        errorType: "Property Not Found",
        solution: "객체의 속성명을 확인하고 올바른 속성명을 사용하세요.",
        severity: "medium"
      };
    }
    
    return {
      summary: "TypeScript 컴파일 오류가 발생했습니다.",
      errorType: "TypeScript Compilation Error",
      solution: "컴파일러 메시지를 확인하고 코드를 수정하세요.",
      severity: "high"
    };
  }

  private analyzePythonError(output: string): {
    summary: string;
    errorType: string;
    solution: string;
    severity: "low" | "medium" | "high" | "critical";
  } {
    // 더 구체적인 Python 오류 패턴 분석
    if (output.includes("syntaxerror") || output.includes("invalid syntax")) {
      return {
        summary: "Python 구문 오류가 발생했습니다. 괄호나 콜론이 누락되었을 수 있습니다.",
        errorType: "Syntax Error",
        solution: "괄호, 콜론, 들여쓰기 등을 확인하고 구문을 수정하세요. 특히 print() 함수의 괄호를 확인하세요.",
        severity: "medium"
      };
    }
    
    if (output.includes("indentationerror") || output.includes("unexpected indent")) {
      return {
        summary: "Python 들여쓰기 오류가 발생했습니다.",
        errorType: "Indentation Error",
        solution: "일관된 들여쓰기를 사용하고 탭과 스페이스를 혼용하지 마세요. 보통 4칸 스페이스를 사용합니다.",
        severity: "low"
      };
    }
    
    if (output.includes("nameerror") && output.includes("is not defined")) {
      return {
        summary: "정의되지 않은 변수나 함수를 사용했습니다.",
        errorType: "Name Error",
        solution: "변수를 선언하거나 올바른 변수명을 사용하세요. import 문이 필요한 경우 추가하세요.",
        severity: "medium"
      };
    }
    
    if (output.includes("typeerror")) {
      return {
        summary: "Python 타입 오류가 발생했습니다.",
        errorType: "Type Error",
        solution: "변수의 타입을 확인하고 올바른 타입으로 변환하거나 수정하세요.",
        severity: "medium"
      };
    }
    
    if (output.includes("attributeerror")) {
      return {
        summary: "객체에 존재하지 않는 속성이나 메서드에 접근했습니다.",
        errorType: "Attribute Error",
        solution: "객체의 올바른 속성명이나 메서드명을 사용하세요.",
        severity: "medium"
      };
    }
    
    if (output.includes("indexerror")) {
      return {
        summary: "리스트나 배열의 인덱스 오류가 발생했습니다.",
        errorType: "Index Error",
        solution: "인덱스가 범위를 벗어나지 않았는지 확인하세요.",
        severity: "medium"
      };
    }
    
    if (output.includes("keyerror")) {
      return {
        summary: "딕셔너리에서 존재하지 않는 키에 접근했습니다.",
        errorType: "Key Error",
        solution: "딕셔너리에 해당 키가 존재하는지 확인하거나 .get() 메서드를 사용하세요.",
        severity: "medium"
      };
    }
    
    if (output.includes("filenotfounderror")) {
      return {
        summary: "파일을 찾을 수 없습니다.",
        errorType: "File Not Found Error",
        solution: "파일 경로가 올바른지 확인하고 파일이 실제로 존재하는지 확인하세요.",
        severity: "high"
      };
    }
    
    if (output.includes("permissionerror")) {
      return {
        summary: "파일 접근 권한이 없습니다.",
        errorType: "Permission Error",
        solution: "파일의 읽기/쓰기 권한을 확인하거나 관리자 권한으로 실행하세요.",
        severity: "high"
      };
    }
    
    return {
      summary: "Python 실행 오류가 발생했습니다.",
      errorType: "Python Runtime Error",
      solution: "오류 메시지를 자세히 확인하고 코드를 수정하세요. Python 버전 호환성도 확인해보세요.",
      severity: "high"
    };
  }

  private analyzeCppError(output: string): {
    summary: string;
    errorType: string;
    solution: string;
    severity: "low" | "medium" | "high" | "critical";
  } {
    if (output.includes("undefined reference")) {
      return {
        summary: "정의되지 않은 함수나 변수에 대한 참조 오류입니다.",
        errorType: "Undefined Reference",
        solution: "함수나 변수를 정의하거나 올바른 헤더 파일을 포함하세요.",
        severity: "high"
      };
    }
    
    if (output.includes("expected") && output.includes("before")) {
      return {
        summary: "구문 오류가 발생했습니다.",
        errorType: "Syntax Error",
        solution: "세미콜론, 괄호, 중괄호 등을 확인하고 구문을 수정하세요.",
        severity: "medium"
      };
    }
    
    return {
      summary: "C/C++ 컴파일 오류가 발생했습니다.",
      errorType: "C/C++ Compilation Error",
      solution: "컴파일러 메시지를 확인하고 코드를 수정하세요.",
      severity: "high"
    };
  }

  private analyzeJavaError(output: string): {
    summary: string;
    errorType: string;
    solution: string;
    severity: "low" | "medium" | "high" | "critical";
  } {
    if (output.includes("cannot find symbol")) {
      return {
        summary: "정의되지 않은 심볼을 사용했습니다.",
        errorType: "Symbol Not Found",
        solution: "클래스, 메서드, 변수를 올바르게 선언하거나 import하세요.",
        severity: "medium"
      };
    }
    
    if (output.includes("class") && output.includes("not found")) {
      return {
        summary: "클래스를 찾을 수 없습니다.",
        errorType: "Class Not Found",
        solution: "클래스명을 확인하고 올바른 패키지를 import하세요.",
        severity: "high"
      };
    }
    
    return {
      summary: "Java 컴파일 오류가 발생했습니다.",
      errorType: "Java Compilation Error",
      solution: "컴파일러 메시지를 확인하고 코드를 수정하세요.",
      severity: "high"
    };
  }

  private analyzeGenericError(output: string): {
    summary: string;
    errorType: string;
    solution: string;
    severity: "low" | "medium" | "high" | "critical";
  } {
    if (output.includes("error") || output.includes("failed")) {
      return {
        summary: "일반적인 실행 오류가 발생했습니다.",
        errorType: "General Error",
        solution: "오류 메시지를 자세히 확인하고 문제를 해결하세요.",
        severity: "medium"
      };
    }
    
    if (output.includes("warning")) {
      return {
        summary: "경고 메시지가 발생했습니다.",
        errorType: "Warning",
        solution: "경고를 해결하여 코드 품질을 향상시키세요.",
        severity: "low"
      };
    }
    
    return {
      summary: "알 수 없는 오류가 발생했습니다.",
      errorType: "Unknown Error",
      solution: "오류 로그를 분석하여 문제를 파악하세요.",
      severity: "critical"
    };
  }
} 