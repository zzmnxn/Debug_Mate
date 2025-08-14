#include <stdio.h>

int sum(int n) {
    int s = 0;
    for (int i = 1; i <= n; i++) {
        s += i;
    }
    return s;
}

int main(void) {
    printf("sum(5) = %d\n", sum(5));
    if (sum(3) > 0) {
        printf("ok\n");
    }
}
 
