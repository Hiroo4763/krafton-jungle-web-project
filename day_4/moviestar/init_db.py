import random
import requests

from bs4 import BeautifulSoup
from pymongo import MongoClient  # pymongo를 임포트 하기(패키지 인스톨 먼저 해야겠죠?)

# 아래 uri를 복사해둔 uri로 수정하기
uri = "mongodb+srv://qnrhd90:zhsksdlqjadls123@cluster0.55o0lry.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0&tlsAllowInvalidCertificates=true"
client = MongoClient(uri, 27017)  # MongoDB는 27017 포트로 돌아갑니다.
db = client.dbjungle  # 'dbjungle'라는 이름의 db를 만듭니다.


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
        # 영화 타이틀 정보를 추출한다.
        tag_element = movie.select_one(".ipc-title-link-wrapper > h3")
        if not tag_element:
            continue
        title = tag_element.text.split(". ", 1)[1]

        # 영화 정보 URL을 추출한다.
        info_url_tag_element = movie.select_one(".ipc-title-link-wrapper")
        info_url = f'https://www.imdb.com{info_url_tag_element["href"]}'

        # 영화 포스터 이미지 URL을 추출한다.
        poster_url_tag_element = movie.select_one(".ipc-image")
        if not poster_url_tag_element:
            continue
        poster_url = poster_url_tag_element["src"]

        # 상영 연도 가져온다.
        released_year = movie.select_one(".cli-title-metadata-item:nth-child(1)").text
        # 상영 연도를 정수로 변환한다.
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

        # 좋아요 수를 임의로 만든다
        likes = random.randrange(0, 100)

        # DB에 존재하지 않는 영화인 경우만 추가한다.
        found = list(db.movies.find({"title": title}))
        if found:
            continue

        doc = {
            "title": title,
            "running_time": running_time_minutes,
            "released_year": released_year,
            "poster_url": poster_url,
            "info_url": info_url,
            "pg_level": pg_level,
            "likes": likes,
            "trashed": False,
        }
        db.movies.insert_one(doc)
        print(
            "완료: ",
            title,
            running_time_minutes,
            released_year,
            poster_url,
            info_url,
            pg_level,
            likes,
        )


if __name__ == "__main__":
    # 기존의 movies 콜렉션을 삭제하기
    db.movies.drop()

    # 영화 사이트를 scraping 해서 db 에 채우기
    insert_all()
