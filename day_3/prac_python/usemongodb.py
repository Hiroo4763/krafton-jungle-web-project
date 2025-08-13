from pymongo import MongoClient

# .env 파일에서 uri를 불러오기 위해
import os
from dotenv import load_dotenv

load_dotenv()

# 아래 uri를 복사해둔 uri로 수정하기
uri = os.getenv("Atlas_uri")
client = MongoClient(uri, 27017)
db = client.jungle

# 코딩 시작
# MongoDB에서 데이터 모두 보기
all_users = list(db.users.find({}))

# 참고) MongoDB에서 특정 조건의 데이터 모두 보기
same_ages = list(db.users.find({"age": 21}))

print(all_users[0])  # 0번째 결과값을 보기
print(all_users[0]["name"])  # 0번째 결과값의 'name'을 보기

for user in all_users:  # 반복문을 돌며 모든 결과값을 보기
    print(user)
