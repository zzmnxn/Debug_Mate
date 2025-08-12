#include <stdio.h>

int main() {
    int x = 10;
    if (x > 5) {
        printf("x is greater than 5\n");
        if (x > 8) {
            printf("x is greater than 8\n");
        // 중괄호 닫힘 누락
    }
    return 0;
} 