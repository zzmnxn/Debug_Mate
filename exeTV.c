#include <stdio.h>
#include <string.h>
#include <stdlib.h> // for malloc, free
#include <curl/curl.h>
#include "cJSON.h" // cJSON 헤더 파일을 포함합니다.

// Gemini API 키를 여기에 입력하세요.
#define GEMINI_API_KEY "AIzaSyD9f8IvST_OL9nZOGKiRzJaOqaS0uUobs4"

// API 응답을 저장하고 처리할 콜백 함수
size_t write_callback(void *contents, size_t size, size_t nmemb, void *userp) {
    size_t real_size = size * nmemb;
    char **response_ptr = (char **)userp;
    size_t current_len = (*response_ptr == NULL) ? 0 : strlen(*response_ptr);

    *response_ptr = (char*)realloc(*response_ptr, current_len + real_size + 1);
    if (*response_ptr == NULL) {
        fprintf(stderr, "Failed to reallocate memory for response.\n");
        return 0;
    }
    memcpy(*response_ptr + current_len, contents, real_size);
    (*response_ptr)[current_len + real_size] = '\0';

    return real_size;
}

// C 문자열 리터럴에서 플레이스홀더를 실제 값으로 대체하는 함수
char* create_post_data(const char* userQuery, const char* code) {
    // 여기에 동적으로 JSON 문자열을 생성하는 코드가 필요합니다.
    // cJSON 라이브러리를 사용하면 훨씬 안전하고 편리합니다.
    // 이 예시에서는 플레이스홀더를 대체하는 방식으로 구현합니다.
    
    const char *json_template =
        "{"
        "  \"contents\": ["
        "    {"
        "      \"parts\": ["
        "        {"
        "          \"text\": \"Analyze the following C code and the user's question to trace the flow of variables.\\n\\n **User Question:**\\n \\\"%s\\\"\\n\\n **Code:**\\n ```\\n %s\\n ```\\n\\n **Instructions:**\\n 1. Analyze the user's natural language query to understand their intent. If there are typos, infer the most likely correct variable or function name.\\n 2. If the query mentions a **struct, union, or enum** variable, analyze it as follows:\\n    - **struct:** Trace the flow of each individual member variable.\\n    - **union:** State that it shares memory and trace the flow of the member that was most recently assigned a value.\\n    - **enum:** Trace the flow of the enum variable and specify which constant value it holds at each point.\\n 3. If the user does not specify a variable or function name, explain the flow of all key variables in the code.\\n 4. If the user's question is not related to variable tracing, respond with \\\"The question is not related to variable tracing.\\\".\\n 5. Respond in Korean.\\n\\n **Response Format:**\\n // Response Format\\n - Present each variable with its function scope using the format **Variable Name: variable_name (in function_name function)**.\\n - Include the following sections for each variable:\\n   - [Initial Value]: Describe the initial value of the variable(Output only the numeric or literal value (no explanation)).\\n   - [Update Process]: Summarize the changes step-by-step using short bullet points (use \\\"-\\\" at the beginning of each line, avoid long sentences).\\n   - [Final Value]: Indicate the final value stored in the variable(Output only the final value (no explanation)).\\n - Write all section titles in English (Variable Name, Initial Value, Update Process, Final Value), and provide the explanations in Korean.\\n\\n // Example of the response format\\n - For example:\\n ```\\n Variable Name: counter (in main function)\\n [Initial Value] 0\\n [Update Process]\\n   - 루프 진입 시마다 1씩 증가\\n   - 총 10회 반복\\n [Final Value] 10\\n ```\\n // Instruct the AI to follow this format\\n Please follow this format for your explanation.\\n\""
        "        }"
        "      ]"
        "    }"
        "  ],"
        "  \"generationConfig\": {"
        "    \"temperature\": 0.3"
        "  }"
        "}";

    // 필요한 버퍼 크기 계산 (안전하게 넉넉하게 잡음)
    size_t required_size = strlen(json_template) + strlen(userQuery) + strlen(code) + 1;
    char* post_data = (char*)malloc(required_size);

    if (post_data == NULL) {
        fprintf(stderr, "Failed to allocate memory for post data.\n");
        return NULL;
    }

    // sprintf 대신 snprintf를 사용하여 버퍼 오버플로우 방지
    snprintf(post_data, required_size, json_template, userQuery, code);

    return post_data;
}

int main(void) {
    CURL *curl;
    CURLcode res;
    char *api_response = NULL; 
    
    // 테스트용 임시 변수 값
    const char* user_query_value = "What is the flow of the variable `count`?";
    const char* code_value = 
        "int main() {\n"
        "    int count = 0;\n"
        "    for (int i = 0; i < 5; i++) {\n"
        "        count++;\n"
        "    }\n"
        "    return 0;\n"
        "}";

    // 1. libcurl 전역 초기화
    curl_global_init(CURL_GLOBAL_ALL);

    // 2. CURL 핸들 생성
    curl = curl_easy_init();
    if (curl) {
        // 3. 옵션 설정
        char url[256];
        snprintf(url, sizeof(url), "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=%s", GEMINI_API_KEY);
        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_POST, 1L);

        // JSON 데이터 동적 생성
        char* post_data = create_post_data(user_query_value, code_value);
        if (post_data == NULL) {
            curl_easy_cleanup(curl);
            curl_global_cleanup();
            return 1;
        }
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, post_data);

        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &api_response);

        // 4. 요청 수행
        res = curl_easy_perform(curl);
        
        // 5. 오류 처리 및 응답 파싱
        if(res != CURLE_OK) {
            fprintf(stderr, "curl_easy_perform() failed: %s\n", curl_easy_strerror(res));
        } else {
            long http_code = 0;
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);

            if (http_code == 200 && api_response != NULL) {
                printf("성공적인 응답 (HTTP 200 OK)\n");
                printf("--- raw response ---\n%s\n--- end of raw response ---\n", api_response);
                
                // JSON 파싱 시작
                cJSON *root = cJSON_Parse(api_response);
                if (root == NULL) {
                    const char *error_ptr = cJSON_GetErrorPtr();
                    if (error_ptr != NULL) {
                        fprintf(stderr, "JSON 파싱 오류: %s\n", error_ptr);
                    }
                } else {
                    // 응답에서 사용된 토큰 수 정보 추출
                    cJSON *usage_metadata = cJSON_GetObjectItemCaseSensitive(root, "usageMetadata");
                    if (usage_metadata != NULL) {
                        cJSON *prompt_tokens = cJSON_GetObjectItemCaseSensitive(usage_metadata, "promptTokenCount");
                        cJSON *candidate_tokens = cJSON_GetObjectItemCaseSensitive(usage_metadata, "candidatesTokenCount");
                        cJSON *total_tokens = cJSON_GetObjectItemCaseSensitive(usage_metadata, "totalTokenCount");

                        if (cJSON_IsNumber(prompt_tokens)) {
                            printf("프롬프트 토큰 수: %d\n", prompt_tokens->valueint);
                        }
                        if (cJSON_IsNumber(candidate_tokens)) {
                            printf("응답 토큰 수: %d\n", candidate_tokens->valueint);
                        }
                        if (cJSON_IsNumber(total_tokens)) {
                            printf("총 토큰 수: %d\n", total_tokens->valueint);
                        }
                    }

                    // 응답 텍스트 추출 (첫 번째 후보의 텍스트)
                    cJSON *candidates = cJSON_GetObjectItemCaseSensitive(root, "candidates");
                    if (cJSON_IsArray(candidates) && cJSON_GetArraySize(candidates) > 0) {
                        cJSON *first_candidate = cJSON_GetArrayItem(candidates, 0);
                        cJSON *content = cJSON_GetObjectItemCaseSensitive(first_candidate, "content");
                        cJSON *parts = cJSON_GetObjectItemCaseSensitive(content, "parts");
                        if (cJSON_IsArray(parts) && cJSON_GetArraySize(parts) > 0) {
                            cJSON *text_part = cJSON_GetArrayItem(parts, 0);
                            cJSON *text_value = cJSON_GetObjectItemCaseSensitive(text_part, "text");
                            if (cJSON_IsString(text_value) && text_value->valuestring != NULL) {
                                printf("\nGemini AI의 답변:\n%s\n", text_value->valuestring);
                            }
                        }
                    }
                    cJSON_Delete(root); // JSON 객체 메모리 해제
                }
            } else {
                fprintf(stderr, "API 요청 실패! HTTP Status Code: %ld\n", http_code);
                fprintf(stderr, "에러 응답:\n%s\n", api_response ? api_response : "No error response data.");
            }
        }

        // 6. 자원 해제
        free(post_data); // 동적으로 생성한 post_data 메모리 해제
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }
    
    if (api_response) {
        free(api_response);
    }

    curl_global_cleanup();

    return 0;
}