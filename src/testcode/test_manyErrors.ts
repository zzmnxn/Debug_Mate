// main.c — DebugAgent(afterDebugFromCode) 종합 테스트 파일
// 사용법: 아래 SELECT 값을 바꾸고 다시 실행하세요.
//  1: 정상 실행 (기준선)
//  2: 문법 오류 (세미콜론 누락)                    -> 컴파일 실패
//  3: 선언되지 않은 변수 사용                      -> 컴파일 실패
//  4: 0으로 나눗셈                                 -> 경고 + 런타임 오류 가능
//  5: 널 포인터 역참조                              -> 런타임 크래시(ASan/UBSan)
//  6: 버퍼 오버플로우                               -> 런타임 크래시(ASan)
//  7: Use-After-Free                                -> 런타임 크래시/경고
//  8: 메모리 누수                                   -> -fanalyzer 경고 가능
//  9: 위험한 캐스팅(정수→포인터)                    -> UB 가능
// 10: 초기화되지 않은 변수 사용                      -> 경고/UB 가능
// 11: Double free                                  -> 런타임 크래시/경고
// 12: 무한 루프                                    -> 5초 타임아웃 + [Hint] 출력 기대
// 13: 종료 조건 없는 재귀                           -> 스택 오버플로우/크래시
// 14: do-while 영구 참                              -> 무한 루프
// 15: 감소하는 for + 증가 조건 불일치               -> 논리적 무한 루프

#define SELECT 1

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#if SELECT == 1
int main(void) {
    // 기준선: 아무 문제 없음
    printf("Hello, DebugAgent! (baseline)\n");
    return 0;
}
#elif SELECT == 2
int main(void) {
    // 문법 오류: 세미콜론 누락
    printf("This will not compile")
    return 0;
}
#elif SELECT == 3
int main(void) {
    // 선언되지 않은 변수 사용
    int a = 10;
    printf("%d\n", a + x); // x 미선언
    return 0;
}
#elif SELECT == 4
int main(void) {
    // 0으로 나눗셈 (정적 경고 + UBSan 경고 기대)
    int a = 10, b = 0;
    int c = a / b;
    printf("c=%d\n", c);
    return 0;
}
#elif SELECT == 5
int main(void) {
    // 널 포인터 역참조
    int *p = NULL;
    printf("%d\n", *p);
    return 0;
}
#elif SELECT == 6
int main(void) {
    // 버퍼 오버플로우
    char buf[8];
    for (int i = 0; i <= 8; i++) buf[i] = 'A'; // 범위 초과
    buf[7] = '\0';
    printf("%s\n", buf);
    return 0;
}
#elif SELECT == 7
int main(void) {
    // Use-After-Free
    char *p = (char*)malloc(4);
    if (!p) return 1;
    strcpy(p, "OK");
    free(p);
    // 해제 후 접근
    printf("%c\n", p[0]);
    return 0;
}
#elif SELECT == 8
int leak(void) {
    // 명시적 누수 (free 누락) -> -fanalyzer가 보고할 수 있음
    char *p = (char*)malloc(100);
    if (p) strcpy(p, "leak");
    // free(p); // 의도적으로 미호출
    return p ? p[0] : 0;
}
int main(void) {
    int v = leak();
    printf("v=%d\n", v);
    return 0;
}
#elif SELECT == 9
int main(void) {
    // 위험한 캐스팅: 정수 값을 포인터로 캐스팅 후 역참조 (UB)
    long x = 12345;
    int *ptr = (int*)x; // UB
    printf("%d\n", *ptr);
    return 0;
}
#elif SELECT == 10
int main(void) {
    // 초기화되지 않은 변수 사용
    int x;
    int y = x + 5; // x 미초기화
    printf("y=%d\n", y);
    return 0;
}
#elif SELECT == 11
int main(void) {
    // Double free
    char *p = (char*)malloc(10);
    if (!p) return 1;
    free(p);
    free(p); // 두 번 해제
    return 0;
}
#elif SELECT == 12
int main(void) {
    // 무한 루프 (타임아웃 → handlers가 [Hint] loopCheck()를 넣어줌)
    volatile int i = 0;
    while (1) { i++; }
    return 0;
}
#elif SELECT == 13
int boom(int n) {
    // 종료 조건 없는 재귀
    return 1 + boom(n + 1);
}
int main(void) {
    printf("%d\n", boom(0));
    return 0;
}
#elif SELECT == 14
int main(void) {
    // do-while 영구 참
    int z = 1;
    do {
        // 작업...
    } while (z); // z가 변하지 않음
    return 0;
}
#elif SELECT == 15
int main(void) {
    // 감소하는 for + 증가 조건 불일치 → 종료 불가
    for (int i = 10; i < 20; i--) {
        if (i < -1000) break; // 절대 도달 X
    }
    return 0;
}
#else
#error "유효하지 않은 SELECT 값입니다."
#endif
