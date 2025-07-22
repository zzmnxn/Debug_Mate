git remote remove origin

git remote -v 
로 삭제된 거 확인

git remote add origin https://github.com/zzmnxn/Debug_Mate

# 최신 main으로 이동
git checkout main
git pull origin main  # 최신화

# 작업용 브랜치 생성 및 이동
git checkout -b jimin


#  작업 후 커밋 & 푸시
git add .
git commit -m "소희: 일기 작성 기능"
git push origin sohee/feature-diary
