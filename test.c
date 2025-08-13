#include <stdio.h>
#include <stdlib.h> // malloc, free 등을 위해 필요

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
    printf("--- 변수 분석 테스트 시작 ---\n\n");

    // 2. 지역 변수 분석 (Local Variable Analysis)
    int local_var = 20;
    float PI = 3.14159;
    char local_char = 'B'; // 전역 변수와 다른 변수명

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
        static int static_local_count = 0; // 이 값은 함수 호출 사이에 유지됨
        static_local_count++;
        printf("정적 지역 변수 static_local_count: %d\n", static_local_count);
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
    free(dynamic_array); // 메모리 해제
    // dynamic_array = NULL; // 댕글링 포인터 방지 (선택 사항)
    printf("동적 배열 메모리 해제 완료.\n\n");

    // 댕글링 포인터 테스트 (주석 해제 시 문제 발생 가능)
    // printf("해제 후 dynamic_array[0]: %d\n", dynamic_array[0]);

    // 10. 배열 분석 (Array Analysis)
    int scores[3] = {85, 90, 78};
    char greeting[] = "Hello"; // 널 종료 문자 포함

    printf("배열 scores[0]: %d\n", scores[0]);
    printf("문자열 greeting: %s\n\n", greeting);

    // 11. const 변수 사용
    printf("const MAX_VALUE: %d\n\n", MAX_VALUE);
    // MAX_VALUE = 200; // 컴파일 오류 발생: read-only variable is not assignable

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


    printf("--- 변수 분석 테스트 종료 ---\n");

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