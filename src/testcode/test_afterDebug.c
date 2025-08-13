/* afterdebug_recipe_suite.c — crash-assured edition
 * 빌드: gcc afterdebug_recipe_suite.c -O0 -g -Wall -Wextra -o afterdebug_suite
 * 실행: ./afterdebug_suite
 */

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#if defined(__unix__) || defined(__APPLE__)
  #include <unistd.h>
  #include <signal.h>
  #include <sys/wait.h>
  #define HAVE_FORK 1
#else
  #define HAVE_FORK 0
#endif

/* ===== 실행 모드 ===== */
#define RUN_FORK 1

/* ===== 레시피 선택 ===== */
enum {
  RECIPE_BASELINE      = 0,
  RECIPE_WARNINGS      = 1,
  RECIPE_MEM_CRASH     = 2,
  RECIPE_BOUNDS        = 3,
  RECIPE_LOOP_RECUR    = 4,
  RECIPE_POINTERS      = 5,
  RECIPE_FILEIO        = 6,
  RECIPE_ALL_RISKY     = 7,
  RECIPE_CUSTOM        = 99
};
#define RECIPE 0

/* ===== 기본 플래그(0 시작) ===== */
#ifndef F_WARNING_TRUNC
#define F_WARNING_TRUNC 0
#endif
#ifndef F_WARNING_ASSIGN_IN_IF
#define F_WARNING_ASSIGN_IN_IF 0
#endif
#ifndef F_WARNING_SHADOW
#define F_WARNING_SHADOW 0
#endif
#ifndef F_WARNING_SIGNED_UNSIGNED
#define F_WARNING_SIGNED_UNSIGNED 0
#endif

#ifndef F_DIV0
#define F_DIV0 0
#endif
#ifndef F_NULL_DEREF
#define F_NULL_DEREF 0
#endif
#ifndef F_STACK_OFLOW
#define F_STACK_OFLOW 0
#endif
#ifndef F_HEAP_OFLOW
#define F_HEAP_OFLOW 0
#endif
#ifndef F_OOB_READ
#define F_OOB_READ 0
#endif
#ifndef F_OOB_WRITE
#define F_OOB_WRITE 0
#endif
#ifndef F_UAF
#define F_UAF 0
#endif
#ifndef F_DFREE
#define F_DFREE 0
#endif
#ifndef F_INVALID_FREE
#define F_INVALID_FREE 0
#endif
#ifndef F_LEAK
#define F_LEAK 0
#endif
#ifndef F_NULL_FUNPTR
#define F_NULL_FUNPTR 0
#endif
#ifndef F_CAST_INT_TO_PTR
#define F_CAST_INT_TO_PTR 0
#endif
#ifndef F_MISALIGN
#define F_MISALIGN 0
#endif
#ifndef F_UNINIT
#define F_UNINIT 0
#endif
#ifndef F_INT_OVERFLOW
#define F_INT_OVERFLOW 0
#endif
#ifndef F_SHIFT_OOB
#define F_SHIFT_OOB 0
#endif
#ifndef F_FOPEN_NULL_USE
#define F_FOPEN_NULL_USE 0
#endif
#ifndef F_INF_LOOP
#define F_INF_LOOP 0
#endif
#ifndef RECUR_DEPTH
#define RECUR_DEPTH 0
#endif

/* ===== 레시피 적용 ===== */
#if   RECIPE==RECIPE_MEM_CRASH
  #undef F_NULL_DEREF
  #undef F_UAF
  #undef F_DFREE
  #undef F_INVALID_FREE
  #define F_NULL_DEREF 1
  #define F_UAF 1
  #define F_DFREE 1
  #define F_INVALID_FREE 1
#elif RECIPE==RECIPE_BASELINE
  /* no-op */
#elif RECIPE==RECIPE_BOUNDS
  #undef F_STACK_OFLOW
  #undef F_HEAP_OFLOW
  #undef F_OOB_READ
  #undef F_OOB_WRITE
  #define F_STACK_OFLOW 1
  #define F_HEAP_OFLOW 1
  #define F_OOB_READ 1
  #define F_OOB_WRITE 1
#elif RECIPE==RECIPE_POINTERS
  #undef F_DIV0
  #undef F_CAST_INT_TO_PTR
  #undef F_NULL_FUNPTR
  #undef F_MISALIGN
  #undef F_UNINIT
  #undef F_INT_OVERFLOW
  #undef F_SHIFT_OOB
  #define F_DIV0 1
  #define F_CAST_INT_TO_PTR 1
  #define F_NULL_FUNPTR 1
  #define F_MISALIGN 1
  #define F_UNINIT 1
  #define F_INT_OVERFLOW 1
  #define F_SHIFT_OOB 1
#elif RECIPE==RECIPE_FILEIO
  #undef F_FOPEN_NULL_USE
  #define F_FOPEN_NULL_USE 1
#elif RECIPE==RECIPE_ALL_RISKY
  #undef F_NULL_DEREF
  #undef F_UAF
  #undef F_DFREE
  #undef F_INVALID_FREE
  #undef F_STACK_OFLOW
  #undef F_HEAP_OFLOW
  #undef F_OOB_READ
  #undef F_OOB_WRITE
  #undef F_LEAK
  #undef F_DIV0
  #undef F_CAST_INT_TO_PTR
  #undef F_NULL_FUNPTR
  #undef F_MISALIGN
  #undef F_UNINIT
  #undef F_INT_OVERFLOW
  #undef F_SHIFT_OOB
  #undef F_FOPEN_NULL_USE
  #define F_NULL_DEREF 1
  #define F_UAF 1
  #define F_DFREE 1
  #define F_INVALID_FREE 1
  #define F_STACK_OFLOW 1
  #define F_HEAP_OFLOW 1
  #define F_OOB_READ 1
  #define F_OOB_WRITE 1
  #define F_LEAK 1
  #define F_DIV0 1
  #define F_CAST_INT_TO_PTR 1
  #define F_NULL_FUNPTR 1
  #define F_MISALIGN 1
  #define F_UNINIT 1
  #define F_INT_OVERFLOW 1
  #define F_SHIFT_OOB 1
  #define F_FOPEN_NULL_USE 1
#endif

/* ===== 강제 크래시 유틸 ===== */
static void force_crash_if_survived(const char* tag) {
    fprintf(stderr, "[FORCE-CRASH] survived %s; forcing SIGSEGV\n", tag);
#if defined(__GNUC__)
    __builtin_trap();               /* SIGILL on many platforms */
#else
    *(volatile int*)0 = 1;          /* SIGSEGV */
#endif
    (void)tag;
}

/* ===== 케이스 구현 ===== */
static void do_null(void){
#if F_NULL_DEREF
    fprintf(stderr, "[CASE] NULL deref\n");
    /* 확실한 크래시: 널 주소에 쓰기 */
    *(volatile int*)0 = 123;        /* SIGSEGV 보장 */
    force_crash_if_survived("NULL");
#endif
}

static void do_uaf(void){
#if F_UAF
    fprintf(stderr, "[CASE] UAF\n");
    char *p = (char*)malloc(16);
    if (!p) exit(1);
    strcpy(p, "OK");
    free(p);

    /* UAF 시도 (산티 없으면 안 터질 수 있으므로) */
    volatile char c = p[0];
    (void)c;

    /* 살아있으면 강제 크래시로 신호를 남김 */
    force_crash_if_survived("UAF");
#endif
}

static void do_dfree(void){
#if F_DFREE
    fprintf(stderr, "[CASE] double free\n");
    char *p = (char*)malloc(32);
    if (!p) exit(1);
    free(p);
    /* glibc 등 대부분에서 abort(SIGABRT) 발생 */
    free(p);
    /* 혹시나 살아있다면 강제 크래시 */
    force_crash_if_survived("DFREE");
#endif
}

static void do_invalid_free(void){
#if F_INVALID_FREE
    fprintf(stderr, "[CASE] invalid free\n");
    /* 확실히 잘못된 포인터: 스택 변수/정수 리터럴 주소 */
    int x = 0;
    free(&x);                        /* 대개 abort */
    /* 혹시 돌아오면 강제 크래시 */
    force_crash_if_survived("INVALID_FREE");
#endif
}

/* 보너스: 경계/오버플로 계열도 안전망 포함 */
static void do_stack_oflow(void){
#if F_STACK_OFLOW
    fprintf(stderr, "[CASE] stack overflow(copy)\n");
    char buf[8];
    const char* s = "THIS_IS_A_VERY_LONG_STRING";
    strcpy(buf, s);
    force_crash_if_survived("STACK_OVERFLOW");
#endif
}

static void do_heap_oflow(void){
#if F_HEAP_OFLOW
    fprintf(stderr, "[CASE] heap overflow(copy)\n");
    char* p = (char*)malloc(8);
    const char* s = "THIS_IS_A_VERY_LONG_STRING";
    strcpy(p, s);
    /* 해제까지 진행되면 살아남았다는 뜻 */
    free(p);
    force_crash_if_survived("HEAP_OVERFLOW");
#endif
}

static void do_oob(void){
#if F_OOB_READ || F_OOB_WRITE
    fprintf(stderr, "[CASE] OOB read/write\n");
    int* a = (int*)malloc(3*sizeof(int));
    a[0]=1; a[1]=2; a[2]=3;
  #if F_OOB_READ
    volatile int v = a[3];
    (void)v;
  #endif
  #if F_OOB_WRITE
    a[3] = 777;
  #endif
    free(a);
    force_crash_if_survived("OOB");
#endif
}

static void do_div0(void){
#if F_DIV0
    fprintf(stderr, "[CASE] div0\n");
    volatile int z = 0;
    volatile int x = 10;
    int y = x / z;                   /* 보통 SIGFPE */
    (void)y;
    force_crash_if_survived("DIV0");
#endif
}

static void do_cast_int_to_ptr(void){
#if F_CAST_INT_TO_PTR
    fprintf(stderr, "[CASE] cast int->ptr\n");
    uintptr_t raw = 1;               /* 아주 낮은 주소 → 접근 시 SEGV */
    int* p = (int*)raw;
    *p = 42;
    force_crash_if_survived("CAST");
#endif
}

static void do_null_funptr(void){
#if F_NULL_FUNPTR
    fprintf(stderr, "[CASE] null func ptr\n");
    void (*fp)(void) = NULL;
    fp();                            /* SIGSEGV */
    force_crash_if_survived("NULL_FUNPTR");
#endif
}

static void do_misalign(void){
#if F_MISALIGN
    fprintf(stderr, "[CASE] misaligned write\n");
    char* buf = (char*)malloc(sizeof(int)+1);
    int* ip = (int*)(buf+1);
    *ip = 42;                        /* 일부 환경에선 통과할 수도… */
    free(buf);
    force_crash_if_survived("MISALIGN");
#endif
}

static void do_uninit(void){
#if F_UNINIT
    fprintf(stderr, "[CASE] uninitialized use\n");
    int x; int y = x + 5;
    printf("%d\n", y);
    force_crash_if_survived("UNINIT");
#endif
}

static void do_int_overflow(void){
#if F_INT_OVERFLOW
    fprintf(stderr, "[CASE] signed overflow\n");
    volatile int v = 2147483640;
    for (int i=0;i<20;i++) v += 1;
    printf("%d\n", v);
    force_crash_if_survived("S-OVF");
#endif
}

static void do_shift_oob(void){
#if F_SHIFT_OOB
    fprintf(stderr, "[CASE] shift out-of-bounds\n");
    int s = -1;
    int v = 1 << s;
    (void)v;
    force_crash_if_survived("SHIFT");
#endif
}

static void do_fopen_null_use(void){
#if F_FOPEN_NULL_USE
    fprintf(stderr, "[CASE] fopen NULL use\n");
    FILE* fp = fopen("no_such_file.xyz","r");
    char line[8];
    fgets(line, sizeof(line), fp);   /* fp==NULL이면 크래시 가능 */
    if (fp) fclose(fp);
    force_crash_if_survived("FOPEN_NULL_USE");
#endif
}

/* ===== 하네스 ===== */
typedef void(*case_fn)(void);
struct item { const char* name; case_fn fn; };

static struct item items[] = {
  {"null_deref",          do_null},
  {"uaf",                 do_uaf},
  {"double_free",         do_dfree},
  {"invalid_free",        do_invalid_free},

  {"stack_overflow",      do_stack_oflow},
  {"heap_overflow",       do_heap_oflow},
  {"oob_read_write",      do_oob},
  {"div0",                do_div0},
  {"cast_int_to_ptr",     do_cast_int_to_ptr},
  {"null_funptr",         do_null_funptr},
  {"misalign",            do_misalign},
  {"uninit",              do_uninit},
  {"int_overflow",        do_int_overflow},
  {"shift_oob",           do_shift_oob},
  {"fopen_null_use",      do_fopen_null_use},
};

#if HAVE_FORK
static void run_one(const char* name, case_fn fn){
  fflush(NULL);
  pid_t pid = fork();
  if (pid < 0) { perror("fork"); exit(1); }
  if (pid == 0) {
    fprintf(stderr, "\n===== CASE START: %s =====\n", name);
    fflush(NULL);
    fn();
    fprintf(stderr, "===== CASE END (normal): %s =====\n", name);
    _exit(0);
  } else {
    int st=0; waitpid(pid,&st,0);
    if (WIFEXITED(st)) {
      fprintf(stderr, "[SUMMARY] %-18s exit %d\n", name, WEXITSTATUS(st));
    } else if (WIFSIGNALED(st)) {
      fprintf(stderr, "[SUMMARY] %-18s signal %d (%s)\n", name, WTERMSIG(st), strsignal(WTERMSIG(st)));
    } else {
      fprintf(stderr, "[SUMMARY] %-18s status 0x%x\n", name, st);
    }
  }
}
#endif

int main(void){
  puts("=== afterDebug crash-assured suite ===");
  size_t n = sizeof(items)/sizeof(items[0]);
#if RUN_FORK && HAVE_FORK
  for (size_t i=0;i<n;i++) run_one(items[i].name, items[i].fn);
#else
  for (size_t i=0;i<n;i++) items[i].fn();
#endif
  puts("=== done ===");
  return 0;
}
