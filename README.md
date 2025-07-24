실행 방법
 npx ts-node test_driver.ts test.c

--- Git 협업 가이드 ---
원격 저장소 삭제 확인
 git remote -v 

원격 저장소 추가
 git remote add origin https://github.com/zzmnxn/Debug_Mate

 최신 main으로 이동 후 동기화
git checkout main
git pull origin main

브랜치 생성 및 이동
 git checkout -b jimin

작업 후 커밋 & 푸시
git add .
git commit -m "소희: 일기 작성 기능"
git push origin jimin
