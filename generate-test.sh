#!/bin/bash

# 테스트 코드 생성기
# 사용법: ./generate-test.sh [test_name]

TEST_NAME=${1:-"test"}
TARGET_FILE="${TEST_NAME}.c"

echo " 테스트 코드 생성기"
echo "생성할 파일: $TARGET_FILE"
echo ""

# 테스트 케이스 선택
echo "테스트 케이스를 선택하세요:"
echo "1) 기본 Hello World"
echo "2) 루프 테스트 (for)"
echo "3) 조건문 테스트 (if-else)"
echo "4) 배열 테스트"
echo "5) 함수 테스트"
echo "6) 포인터 테스트"
echo "7) 에러가 있는 코드 (컴파일 에러)"
echo "8) 런타임 에러 코드"
echo "9) 복합 테스트 (여러 기능 포함)"
echo ""

read -p "선택 (1-9): " choice

case $choice in
    1)
        cat > "$TARGET_FILE" << 'EOF'
#include <stdio.h>

int main() {
    printf("Hello, World!\n");
    return 0;
}
EOF
        echo " 기본 Hello World 코드 생성 완료"
        ;;
    2)
        cat > "$TARGET_FILE" << 'EOF'
#include <stdio.h>

int main() {
    int i;
    printf("=== For 루프 테스트 ===\n");
    
    for (i = 0; i < 10; i++) {
        printf("i = %d\n", i);
    }
    
    printf("루프 완료\n");
    return 0;
}
EOF
        echo " 루프 테스트 코드 생성 완료"
        ;;
    3)
        cat > "$TARGET_FILE" << 'EOF'
#include <stdio.h>

int main() {
    int score = 85;
    
    printf("=== 조건문 테스트 ===\n");
    printf("점수: %d\n", score);
    
    if (score >= 90) {
        printf("A등급\n");
    } else if (score >= 80) {
        printf("B등급\n");
    } else if (score >= 70) {
        printf("C등급\n");
    } else {
        printf("D등급\n");
    }
    
    return 0;
}
EOF
        echo " 조건문 테스트 코드 생성 완료"
        ;;
    4)
        cat > "$TARGET_FILE" << 'EOF'
#include <stdio.h>

int main() {
    int numbers[5] = {1, 2, 3, 4, 5};
    int i, sum = 0;
    
    printf("=== 배열 테스트 ===\n");
    
    for (i = 0; i < 5; i++) {
        printf("numbers[%d] = %d\n", i, numbers[i]);
        sum += numbers[i];
    }
    
    printf("합계: %d\n", sum);
    return 0;
}
EOF
        echo " 배열 테스트 코드 생성 완료"
        ;;
    5)
        cat > "$TARGET_FILE" << 'EOF'
#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int multiply(int a, int b) {
    return a * b;
}

int main() {
    int x = 10, y = 5;
    
    printf("=== 함수 테스트 ===\n");
    printf("x = %d, y = %d\n", x, y);
    printf("add(x, y) = %d\n", add(x, y));
    printf("multiply(x, y) = %d\n", multiply(x, y));
    
    return 0;
}
EOF
        echo " 함수 테스트 코드 생성 완료"
        ;;
    6)
        cat > "$TARGET_FILE" << 'EOF'
#include <stdio.h>

int main() {
    int value = 42;
    int *ptr = &value;
    
    printf("=== 포인터 테스트 ===\n");
    printf("value = %d\n", value);
    printf("&value = %p\n", (void*)&value);
    printf("ptr = %p\n", (void*)ptr);
    printf("*ptr = %d\n", *ptr);
    
    *ptr = 100;
    printf("포인터로 값 변경 후: value = %d\n", value);
    
    return 0;
}
EOF
        echo " 포인터 테스트 코드 생성 완료"
        ;;
    7)
        cat > "$TARGET_FILE" << 'EOF'
#include <stdio.h>

int main() {
    int x = 10;
    
    printf("=== 컴파일 에러 테스트 ===\n");
    
    // 의도적인 컴파일 에러들
    printf("x = %d\n", x);
    
    // 세미콜론 누락
    printf("이 줄은 세미콜론이 없음")
    
    // 선언되지 않은 변수 사용
    printf("undefined_var = %d\n", undefined_var);
    
    return 0;
}
EOF
        echo " 컴파일 에러 코드 생성 완료"
        ;;
    8)
        cat > "$TARGET_FILE" << 'EOF'
#include <stdio.h>
#include <stdlib.h>

int main() {
    int *ptr = NULL;
    
    printf("=== 런타임 에러 테스트 ===\n");
    
    // NULL 포인터 역참조 (런타임 에러)
    printf("NULL 포인터 값: %d\n", *ptr);
    
    // 배열 범위 초과
    int arr[5] = {1, 2, 3, 4, 5};
    printf("범위 초과 접근: %d\n", arr[10]);
    
    return 0;
}
EOF
        echo " 런타임 에러 코드 생성 완료"
        ;;
    9)
        cat > "$TARGET_FILE" << 'EOF'
#include <stdio.h>
#include <string.h>

// 구조체 정의
typedef struct {
    char name[50];
    int age;
    float score;
} Student;

// 함수 선언
void printStudent(Student s);
int calculateGrade(float score);

int main() {
    printf("=== 복합 테스트 ===\n");
    
    // 변수 선언 및 초기화
    int numbers[] = {1, 2, 3, 4, 5};
    int sum = 0;
    
    // 루프와 조건문
    for (int i = 0; i < 5; i++) {
        if (numbers[i] % 2 == 0) {
            printf("%d는 짝수\n", numbers[i]);
        } else {
            printf("%d는 홀수\n", numbers[i]);
        }
        sum += numbers[i];
    }
    
    printf("합계: %d\n", sum);
    
    // 구조체 사용
    Student student = {"홍길동", 20, 85.5};
    printStudent(student);
    
    // 함수 호출
    int grade = calculateGrade(student.score);
    printf("등급: %c\n", grade);
    
    return 0;
}

void printStudent(Student s) {
    printf("학생 정보: %s, %d세, 점수: %.1f\n", s.name, s.age, s.score);
}

int calculateGrade(float score) {
    if (score >= 90) return 'A';
    else if (score >= 80) return 'B';
    else if (score >= 70) return 'C';
    else return 'D';
}
EOF
        echo " 복합 테스트 코드 생성 완료"
        ;;
    *)
        echo " 잘못된 선택입니다."
        exit 1
        ;;
esac

echo ""
echo " 생성된 파일: $TARGET_FILE"
echo " 디버깅 시작: debug-mate $TARGET_FILE"
echo "  tmux 모드: debug-mate-tmux $TARGET_FILE"
echo ""
