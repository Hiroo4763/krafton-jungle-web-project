import requests
from bs4 import BeautifulSoup

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36"
}
data = requests.get("https://www.imdb.com/chart/top/?ref_=nv_mv_250", headers=headers)
soup = BeautifulSoup(data.text, "html.parser")
movies = soup.select("ul.ipc-metadata-list > li")

for movie in movies:
    tag_element = movie.select_one(".ipc-title-link-wrapper > h3")
    if not tag_element:
        continue

    # 영화번호.영화 제목 가져오기.
    print(tag_element.text)

    # 영화 개봉 연도 가져오기
    released_year = movie.select_one(".cli-title-metadata-item:nth-child(1)")
    print(released_year.text)

    # 영화 상영시간 가져오기
    running_time = movie.select_one(".cli-title-metadata-item:nth-child(2)")
    print(running_time.text)

    # 영상물 등급 가져오기
    pg_level = movie.select_one(".cli-title-metadata-item:nth-child(3)")
    print(pg_level.text)
