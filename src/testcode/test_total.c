#include <stdio.h>
#include <stdlib.h> // malloc, free 등을 위해 필요
#include <string.h> // strcpy 등을 위해 필요
#include <stdint.h> // uintptr_t 등을 위해 필요 (선택 사항)
#include <math.h>   // fabsf를 위해 필요

// 1. 전역 변수 분석 (Global Variable Analysis)
int global_var = 10;
char global_char = 'A';

// 3. 정적 전역 변수 분석 (Static Global Variable Analysis)
static int static_global_count = 0;

// 4. 구조체 분석 (Struct Analysis)
struct Point {
    int x;
    int y;
};

struct Person {
    char name[20];
    int age;
    struct Point location; // 중첩 구조체
};

// 5. 공용체 분석 (Union Analysis)
union Data {
    int i;
    float f;
    char s[20];
};

// 6. 열거형 분석 (Enum Analysis)
enum Status {
    STATUS_IDLE,    // 0
    STATUS_RUNNING, // 1
    STATUS_PAUSED,  // 2
    STATUS_STOPPED = 10 // 특정 값 지정
};

// 11. const 변수 분석 (Const Variable Analysis)
const int MAX_VALUE = 100;

// 12. volatile 변수 분석 (Volatile Variable Analysis)
volatile int sensor_value = 0;

// 13. 비트필드 분석 (Bitfield Analysis)
struct Flags {
    unsigned int is_active : 1; // 1비트
    unsigned int is_ready : 1;  // 1비트
    unsigned int error_code : 4; // 4비트 (0-15)
};


void modify_variables(int value, int* ptr_val); // 함수 선언

int main() {
    printf("--- afterDebug 테스트 코드 시작 ---\n\n");

    // 2. 지역 변수 분석 (Local Variable Analysis)
    int local_var = 20;
    float PI = 3.14159;
    char local_char = 'B';

    // 동일한 변수명 사용 (스코프 분리)
    {
        int local_var = 50; // 블록 스코프 내의 새로운 local_var
        printf("블록 내 local_var: %d\n", local_var);
    }
    printf("블록 밖 local_var: %d\n\n", local_var); // 원래 local_var (20)


    // 1. 전역 변수 사용
    printf("전역 변수 global_var: %d\n", global_var);
    printf("전역 변수 global_char: %c\n\n", global_char);

    // 3. 정적 지역 변수 분석 (Static Local Variable Analysis)
    // 이 함수가 호출될 때마다 static_local_count 값은 유지됨
    void increment_static_local() {
        static int static_local_count_func = 0; // 이 값은 함수 호출 사이에 유지됨
        static_local_count_func++;
        printf("정적 지역 변수 static_local_count_func: %d\n", static_local_count_func);
    }
    increment_static_local(); // 1
    increment_static_local(); // 2
    printf("정적 전역 변수 static_global_count: %d\n\n", static_global_count); // 0 (초기값)

    // 4. 구조체 사용
    struct Person p1 = {"Alice", 30, {10, 20}};
    struct Person p2; // 초기화 없이 선언
    p2.age = 25;
    snprintf(p2.name, sizeof(p2.name), "%s", "Bob");
    p2.location.x = 5;
    p2.location.y = 15;

    printf("구조체 p1.name: %s, p1.age: %d, p1.location.x: %d\n", p1.name, p1.age, p1.location.x);
    printf("구조체 p2.name: %s, p2.age: %d, p2.location.y: %d\n\n", p2.name, p2.age, p2.location.y);

    // 5. 공용체 사용
    union Data d;
    d.i = 123;
    printf("공용체 (int): %d\n", d.i);
    d.f = 98.76;
    printf("공용체 (float): %.2f\n", d.f);
    printf("공용체 (int) - float 할당 후: %d (예상치 못한 값)\n\n", d.i); // 오버라이트된 값

    // 6. 열거형 사용
    enum Status current_status = STATUS_RUNNING;
    printf("열거형 current_status: %d\n", current_status); // 1 출력
    current_status = STATUS_STOPPED;
    printf("열거형 current_status (STOPPED): %d\n\n", current_status); // 10 출력

    // 7. 단일 포인터 분석 (Single Pointer Analysis)
    int *ptr_local_var = &local_var;
    printf("local_var의 주소: %p\n", (void*)&local_var);
    printf("ptr_local_var가 가리키는 값: %d\n", *ptr_local_var);
    *ptr_local_var = 200; // local_var 값 변경
    printf("ptr_local_var를 통해 변경된 local_var: %d\n\n", local_var);

    // 8. 이중 포인터 분석 (Double Pointer Analysis)
    int **ptr_to_ptr_local_var = &ptr_local_var;
    printf("ptr_local_var의 주소: %p\n", (void*)&ptr_local_var);
    printf("ptr_to_ptr_local_var가 가리키는 포인터의 값: %p\n", (void*)*ptr_to_ptr_local_var);
    printf("ptr_to_ptr_local_var가 가리키는 값: %d\n\n", **ptr_to_ptr_local_var);

    // 9. 동적 메모리 분석 (Dynamic Memory Analysis)
    int *dynamic_array = (int*) malloc(5 * sizeof(int));
    if (dynamic_array == NULL) {
        printf("메모리 할당 실패!\n");
        return 1;
    }
    for (int i = 0; i < 5; i++) {
        dynamic_array[i] = (i + 1) * 10;
        printf("동적 배열[%d]: %d\n", i, dynamic_array[i]);
    }
    // free(dynamic_array); // 메모리 해제 (주석 처리하여 메모리 누수 발생)
    printf("동적 배열 메모리 해제 완료 (하지만 여기서는 누수 발생).\n\n");

    // 동적 메모리 할당 후 해제하지 않아 메모리 누수 발생
    int* leaked_mem = (int*)malloc(1024 * sizeof(int));
    if (leaked_mem != NULL) {
        printf("추가 메모리 1KB 누수 발생.\n\n");
    }

    // 댕글링 포인터 테스트 (주석 해제 시 문제 발생 가능)
    // printf("해제 후 dynamic_array[0]: %d\n", dynamic_array[0]);

    // 10. 배열 분석 (Array Analysis)
    int scores[3] = {85, 90, 78};
    char greeting[] = "Hello"; // 널 종료 문자 포함

    printf("배열 scores[0]: %d\n", scores[0]);
    printf("문자열 greeting: %s\n\n", greeting);

    // 11. const 변수 사용
    printf("const MAX_VALUE: %d\n\n", MAX_VALUE);
    // MAX_VALUE = 200; // 이 라인의 주석을 해제하면 컴파일 오류 발생: read-only variable is not assignable

    // 12. volatile 변수 사용
    // sensor_value는 외부 요인에 의해 변경될 수 있다고 가정
    printf("volatile sensor_value (초기): %d\n", sensor_value);
    // 외부 Interrupt나 하드웨어에 의해 sensor_value가 변경될 수 있음
    sensor_value = 123; // 코드 내에서 변경
    printf("volatile sensor_value (변경 후): %d\n\n", sensor_value);

    // 13. 비트필드 사용
    struct Flags status_flags;
    status_flags.is_active = 1; // 켜짐
    status_flags.is_ready = 0;  // 꺼짐
    status_flags.error_code = 7; // 에러 코드 7

    printf("비트필드 is_active: %d\n", status_flags.is_active);
    printf("비트필드 is_ready: %d\n", status_flags.is_ready);
    printf("비트필드 error_code: %d\n\n", status_flags.error_code);

    // --- afterDebug 테스트를 위한 의도적인 오류/경고 주입 ---

    // 14. 사용되지 않는 지역 변수 경고
    int unused_local_var; // 이 변수는 사용되지 않아 경고를 유발할 수 있습니다.

    // 15. 초기화되지 않은 변수 사용 경고 (일부 컴파일러에서 감지)
    int uninitialized_value;
    // volatile int temp_val = uninitialized_value; // 주석 해제 시 컴파일러 경고 유발 가능
    // printf("초기화되지 않은 값: %d\n", temp_val);

    // 16. 선언되지 않은 변수 사용 (컴파일 에러 유발)
    // undeclared_variable = 99; // 이 라인의 주석을 해제하면 컴파일 에러 발생

    // 17. 널 포인터 역참조 (런타임 세그멘테이션 오류 유발)
    // int* null_ptr = NULL;
    // *null_ptr = 100; // 이 라인의 주석을 해제하면 런타임 오류 (Segmentation fault) 발생

    // 18. 0으로 나누기 (런타임 오류 유발)
    // int zero_divisor = 0;
    // int division_result = 10 / zero_divisor; // 이 라인의 주석을 해제하면 런타임 오류 (Division by zero) 발생
    // printf("나눗셈 결과: %d\n", division_result);

    // --- LoopCheck 테스트를 위한 루프 패턴 ---

    // 19. 무한 루프 (업데이트 누락)
    /*
    volatile int loop_control_inf = 0;
    printf("\n[LoopTest] 19. 무한 루프 (업데이트 누락) 시작...\n");
    while(loop_control_inf < 5) { // loop_control_inf가 항상 0이므로 무한 루프
        // loop_control_inf++; // 이 라인을 추가하면 정상 종료
    }
    printf("[LoopTest] 19. 무한 루프 종료 (도달하지 않음)\n");
    */

    // 20. 오프바이원 실수 (종료 조건 실수)
    /*
    printf("\n[LoopTest] 20. 오프바이원 실수 시작...\n");
    int i_off_by_one;
    for (i_off_by_one = 0; i_off_by_one <= 5; i_off_by_one++) { // 6번 반복 (0-5)
        printf("[LoopTest] 20. i_off_by_one: %d\n", i_off_by_one);
    }
    // 의도: 0부터 4까지 5번 반복하고 싶었지만, <= 5로 인해 6번 반복 (5번 반복하려면 i_off_by_one < 5)
    printf("[LoopTest] 20. 오프바이원 실수 종료.\n");
    */

    // 21. 부동 소수점 비교 함정 (정확한 종료가 어려움)
    /*
    printf("\n[LoopTest] 21. 부동 소수점 비교 함정 시작...\n");
    float x_float = 0.0f;
    float step_float = 0.1f;
    float target_float = 1.0f;
    // 부동 소수점 정밀도 문제로 x_float가 정확히 target_float과 같지 않을 수 있음
    while (x_float != target_float) {
        printf("[LoopTest] 21. x_float: %.10f\n", x_float);
        x_float += step_float;
        if (x_float > target_float + 0.0000001f) { // 무한 루프 방지를 위한 임계값
            printf("[LoopTest] 21. 부동 소수점 오차로 인한 강제 종료.\n");
            break;
        }
    }
    printf("[LoopTest] 21. 부동 소수점 비교 함정 종료.\n");
    */

    // 22. unsigned 언더플로우 (무한 루프)
    /*
    printf("\n[LoopTest] 22. unsigned 언더플로우 시작...\n");
    unsigned int u_underflow = 5;
    // unsigned int는 0 미만으로 내려가면 최댓값으로 래핑됨 (무한 루프)
    for ( ; u_underflow >= 0; --u_underflow) {
        printf("[LoopTest] 22. u_underflow: %u\n", u_underflow);
        if (u_underflow == 0) { // u_underflow가 0이 되면 다시 최댓값으로 래핑되어 조건(>=0)을 계속 만족
            printf("[LoopTest] 22. unsigned 언더플로우 감지, 임의 종료.\n");
            break; // 무한 루프 방지를 위한 강제 종료
        }
    }
    printf("[LoopTest] 22. unsigned 언더플로우 종료.\n");
    */

    // 23. volatile 조건 불변 (외부 이벤트가 발생하지 않는 경우 무한 루프)
    /*
    volatile int external_flag = 0; // 외부 인터럽트나 스레드에 의해 변경되어야 함
    printf("\n[LoopTest] 23. volatile 조건 불변 시작...\n");
    while (external_flag == 0) {
        // 실제 코드에서는 여기서 외부 변경을 기다림
        // 하지만 external_flag가 코드 내에서 변경되지 않으므로 무한 루프
        // printf("[LoopTest] 23. External flag is 0, spinning...\n"); // 너무 많은 출력 방지
    }
    printf("[LoopTest] 23. volatile 조건 불변 종료 (도달하지 않음).\n");
    */

    // 24. 중첩 + break/continue 복합 (의도치 않은 반복 횟수)
    /*
    printf("\n[LoopTest] 24. 중첩 + break/continue 복합 시작...\n");
    int count_complex = 0;
    for (int i_outer = 0; i_outer < 3; i_outer++) {
        for (int j_inner = 0; j_inner < 3; j_inner++) {
            if (i_outer == 1 && j_inner == 1) {
                continue; // 내부 루프의 이터레이션 스킵
            }
            if (i_outer == 2 && j_inner == 0) {
                break; // 내부 루프 종료, 외부 루프 다음 이터레이션으로
            }
            count_complex++;
        }
    }
    printf("[LoopTest] 24. 최종 count_complex: %d (예상: 6, 실제는 달라질 수 있음)\n", count_complex);
    printf("[LoopTest] 24. 중첩 + break/continue 복합 종료.\n");
    */


    printf("--- afterDebug 테스트 코드 종료 ---\n");

    // 메모리 누수 방지를 위해 할당된 메모리를 해제합니다.
    if (leaked_mem != NULL) {
        free(leaked_mem);
    }
    if (dynamic_array != NULL) { // 위에서 free(dynamic_array)가 주석처리 되었으므로, 여기서 해제
        free(dynamic_array);
    }
    
    return 0;
}

// 함수 정의
void modify_variables(int value, int* ptr_val) {
    // 함수 파라미터도 지역 변수임
    int func_local_var = value * 2;
    printf("modify_variables 함수 내 func_local_var: %d\n", func_local_var);
    *ptr_val = 500; // main 함수의 local_var 값을 변경
    static_global_count++; // 전역 정적 변수 값 변경
}
