from pymongo import MongoClient

# .env 파일에서 uri를 불러오기 위해
import os
from dotenv import load_dotenv

load_dotenv()

# 아래 uri를 복사해둔 uri로 수정하기
uri = os.getenv("Atlas_uri")
client = MongoClient(uri, 27017)
db = client.djungle
