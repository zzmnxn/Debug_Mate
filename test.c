// test_error.c
#include <stdio.h>

static int a;
static int b;

int main() {
    for(int i=0;i<10;i--){
        printf("wow\n");
    }

    int a = 1;
    while(a){
        printf("holly\n");
        a = 0;
    }

    return 0;
}
