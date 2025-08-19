# [Me-mory] Backend
TAVE 15기 연합프로젝트 "Me-mory" 백엔드 소개 페이지입니다🙌🏻

## 📝 About Me-mory
### " 여행의 순간을 감성적으로 기록하고, 나만의 취향과 분위기에 맞춰 정리할 수 있는 맞춤형 다이어리 앱.  
### &emsp;   한 편의 일기로 당신만의 이야기를 담을 수 있도록, 다양한 테마와 감정색으로 완성하는 나만의 일기 아카이브 "

  
<img width="1920" height="1080" alt="#0" src="https://github.com/user-attachments/assets/3d3c3925-9113-4bea-8cfc-0521539350f5" />


여행의 순간을 사진, 감정, 위치, 오디오 등 다양한 정보와 함께 기록하고,
나만의 여행 타임라인과 회고를 만들어주는 감성 여행 기록 서비스입니다.
이 프로젝트의 백엔드는 Spring Boot 기반의 REST API 서버로,
다음과 같은 기능을 제공합니다:

- 여행 및 일기 관리 (사진/감정/위치 포함)
- 방문 국가 및 감정/날씨 태깅
- 카카오 로그인 기반 사용자 인증
- AWS S3 파일 업로드, 마이페이지 통계
- 타임라인 및 대표 이미지 기반 회고 지원

이 서비스는 여행의 감정과 순간을 풍부하게 남기고,
기록을 바탕으로 한 나만의 여행 히스토리를 만들어줍니다.


## 🙋🏻‍♀️ Members

<table>
  <tbody>
    <tr>
      <td align="center">
        <a href="https://github.com/uuyeong">
          <img src="https://avatars.githubusercontent.com/uuyeong" width="100px;" alt="강유영"/>
          <br /><sub><b>강유영</b></sub>
        </a>
      </td>
      <td align="center">
        <a href="https://github.com/zzmnxn">
          <img src="https://avatars.githubusercontent.com/zzmnxn" width="100px;" alt="박지민"/>
          <br /><sub><b>박지민</b></sub>
        </a>
      </td>
      <td align="center">
        <a href="https://github.com/Dlans00">
          <img src="https://avatars.githubusercontent.com/Dlans00" width="100px;" alt="이문정"/>
          <br /><sub><b>이문정</b></sub>
        </a>
      </td>
      </td>
      <td align="center">
        <a href="https://github.com/soba1im">
          <img src="https://avatars.githubusercontent.com/soba1im" width="100px;" alt="임소현"/>
          <br /><sub><b>임소현</b></sub>
        </a>
      </td>
    </tr>
  </tbody>
</table>

## 📄 Dependency

| Dependency Tool | Version |
|------------------|---------|
| Gradle           | 8.7     |
| Java             | 21      |
| Spring Boot      | 3.5.0   |
| MySQL            | 8.0.x   |
| Swagger (springdoc-openapi) | 2.1.0   |
| AWS SDK (S3)     | 2.20.89 |



## 🛠️ Tech Stack

| Category       | Stack                                                     |
|----------------|-----------------------------------------------------------|
| Framework      | Spring Boot                                               |
| ORM            | Spring Data JPA                                           |
| Authorization  | Kakao OAuth2.0 Login                                      |
| Database       | AWS RDS (MySQL 8.0)                                       |
| File Storage   | AWS S3                                                    |
| CI/CD          | GitHub Actions + Docker Hub                               |
| Deployment     | AWS EC2 (Docker Container)                                |
| API Doc        | Swagger UI                                                |

---

## 🛠️ Architecture
<img width="1175" height="945" alt="Me-mory_diagram drawio" src="https://github.com/user-attachments/assets/4295f821-ba83-4e27-8cd3-855ea03d1f7a" />

