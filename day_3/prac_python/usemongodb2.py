import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient

# .env 파일에서 uri를 불러오기 위해
import os
from dotenv import load_dotenv

load_dotenv()

# 아래 uri를 복사해둔 uri로 수정하기
uri = os.getenv("Atlas_uri")
client = MongoClient(uri, 27017)
db = client.djungle


def insert_all():
    # URL을 읽어서 HTML를 받아오고,
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36"
    }
    data = requests.get(
        "https://www.imdb.com/chart/top/?ref_=nv_mv_250", headers=headers
    )

    # HTML을 BeautifulSoup이라는 라이브러리를 활용해 검색하기 용이한 상태로 만듦
    soup = BeautifulSoup(data.text, "html.parser")

    # select를 이용해서, li들을 불러오기
    movies = soup.select(".ipc-page-grid__item--span-2 > .ipc-metadata-list--base > li")
    print(len(movies))

    # movies (li들) 의 반복문을 돌리기
    for movie in movies:
        # movie 안에 a 가 있으면,
        # (조건을 만족하는 첫 번째 요소, 없으면 None을 반환한다.)
        tag_element = movie.select_one(".ipc-title-link-wrapper > h3")
        if not tag_element:
            continue

        # 영화번호.영화 제목 가져오기.
        # 영화 타이틀은 "1. 쇼생크 탈출"과 같이  ". " 으로
        # 구분되어 있으므로 ". " 을 기준으로 split 한 뒤 index가 1인 요소에 접근한다.
        title = tag_element.text.split(". ", 1)[1]

        # 영화 개봉 연도 가져오기
        released_year = movie.select_one(".cli-title-metadata-item:nth-child(1)").text
        # 영화 개봉 연도의 타입을 int로 변환
        released_year = int(released_year)

        # 영화 상영시간 가져오기
        running_time = movie.select_one(".cli-title-metadata-item:nth-child(2)").text

        # 영화 상영시간 분으로 변환하기
        # 1. running_time에서 'h'와 'm'을 제거
        running_time = running_time.replace("h", "").replace("m", "")  # "2 55"로 변경

        # 2. 공백으로 나누기
        hours, minutes = running_time.split(" ")  # "2"와 "55"로 분리

        # 3. 문자열을 숫자로 변환
        hours = int(hours)
        minutes = int(minutes)

        # 4. 시간과 분을 계산
        running_time_minutes = hours * 60 + minutes

        # 영상물 등급 가져오기
        pg_level = movie.select_one(".cli-title-metadata-item:nth-child(3)").text

        doc = {
            "title": title,
            "released_year": released_year,
            "running_time": running_time_minutes,
            "pg_level": pg_level,
        }

        db.movies.insert_one(doc)

        print("완료: ", title, released_year, running_time, pg_level)


if __name__ == "__main__":
    # 기존의 movies 콜렉션을 삭제하기
    db.movies.drop()
    # 영화 사이트를 scraping 해서 db 에 채우기
    insert_all()
