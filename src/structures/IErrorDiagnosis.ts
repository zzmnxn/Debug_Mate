export namespace IErrorDiagnosis {
  export interface ICreate {
    /**
     * 컴파일러 출력 로그
     */
    compilerOutput: string;
    
    /**
     * 파일 경로 (선택사항)
     */
    filePath?: string;
    
    /**
     * 프로그래밍 언어 (선택사항)
     */
    language?: string;
  }

  export interface IUpdate {
    /**
     * 진단 결과
     */
    diagnosis?: string;
    
    /**
     * 오류 유형
     */
    errorType?: string;
    
    /**
     * 해결 방법
     */
    solution?: string;
    
    /**
     * 심각도 (low, medium, high, critical)
     */
    severity?: "low" | "medium" | "high" | "critical";
  }
}

export interface IErrorDiagnosis {
  /**
   * 고유 식별자
   */
  id: string;
  
  /**
   * 원본 컴파일러 출력
   */
  originalOutput: string;
  
  /**
   * 진단된 오류 요약
   */
  diagnosis: string;
  
  /**
   * 오류 유형 분류
   */
  errorType: string;
  
  /**
   * 제안된 해결 방법
   */
  solution: string;
  
  /**
   * 오류 심각도
   */
  severity: "low" | "medium" | "high" | "critical";
  
  /**
   * 파일 경로
   */
  filePath?: string;
  
  /**
   * 프로그래밍 언어
   */
  language?: string;
  
  /**
   * 생성 시간
   */
  created_at: string;
  
  /**
   * 업데이트 시간
   */
  updated_at: string;
} 