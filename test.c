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
