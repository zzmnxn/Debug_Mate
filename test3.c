#include <stdio.h>
#include <string.h> // strcpy를 위해 포함

// 1. 구조체(struct) 정의
struct Point {
    int x;
    int y;
};

struct Person {
    char name[20];
    int age;
    struct Point address_coords; // 구조체 내 구조체
};

// 2. 공용체(union) 정의
union Data {
    int i;
    float f;
    char s[20];
};

// 3. 열거형(enum) 정의
enum Weekday {
    SUNDAY = 0,
    MONDAY,
    TUESDAY,
    WEDNESDAY,
    THURSDAY,
    FRIDAY,
    SATURDAY
};

// 구조체 변수 흐름을 변경하는 함수
void modifyPerson(struct Person *p) {
    p->age = 30;
    p->address_coords.x = 100;
    strcpy(p->name, "Jane Doe");
}

// 공용체 변수 흐름을 보여주는 함수
void processData(union Data d) {
    printf("Initial union data (int): %d\n", d.i); // 이때는 쓰레기 값일 수 있음
    d.f = 123.45;
    printf("Union data after float: %f\n", d.f);
    d.i = 789; // i에 다시 할당 -> f의 값은 유효하지 않게 됨
    printf("Union data after int: %d\n", d.i);
}

// 열거형 변수 흐름을 보여주는 함수
enum Weekday getNextDay(enum Weekday currentDay) {
    if (currentDay == SATURDAY) {
        return SUNDAY;
    } else {
        return (enum Weekday)(currentDay + 1);
    }
}

int main() {
    // struct 변수 테스트
    struct Person person1;
    strcpy(person1.name, "John Doe");
    person1.age = 25;
    person1.address_coords.x = 10;
    person1.address_coords.y = 20;
    printf("Person1 initial age: %d\n", person1.age);
    modifyPerson(&person1);
    printf("Person1 modified age: %d\n", person1.age);
    printf("Person1 modified name: %s\n", person1.name);

    // union 변수 테스트
    union Data myData;
    myData.i = 50;
    printf("myData int: %d\n", myData.i);
    strcpy(myData.s, "Hello Union");
    printf("myData string: %s\n", myData.s);
    printf("myData int after string: %d\n", myData.i); // 값이 깨질 수 있음

    // enum 변수 테스트
    enum Weekday today = MONDAY;
    printf("Today is: %d\n", today); // 1 (MONDAY)
    enum Weekday tomorrow = getNextDay(today);
    printf("Tomorrow is: %d\n", tomorrow); // 2 (TUESDAY)
    enum Weekday weekend = getNextDay(SATURDAY);
    printf("Weekend next day is: %d\n", weekend); // 0 (SUNDAY)

    // 함수 내에서 union 테스트
    union Data funcData;
    funcData.i = 99; // 초기화
    processData(funcData);
    
    return 0;
}