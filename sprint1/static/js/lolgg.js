function requestAPI() {
    const API_KEY = "...";
    const MATCH_COUNT = 10; // ← 한 곳에서 관리

    // 입력값
    const riotID = $("#summoner").val().trim();
    if (!riotID || !riotID.includes("#")) {                // [변경] 형식 검증 추가
        alert("형식: 플레이어이름#태그 (예: Hide on bush#KR1)");
        return;
    }
    const [gameName, tagLine] = riotID.split("#");

    // ===== UI 초기화 =====
    $("#player-name").text(`${gameName}#${tagLine}`);      // [변경] 상단 플레이어 이름 표시
    $("#matches-body").empty();                             // [변경] 이전 전적 초기화

    $('#tier').text("Unranked");
    $('#avg-kills').text("0.0");
    $('#avg-deaths').text("0.0");
    $('#avg-assists').text("0.0");
    $('#avg-cs').text("0.0");
    $('#avg-kda').text("0.00");
    $('#avg-winrate').text("0%");
    $('#match-list').empty();

    // 먼저 감추고 로딩 표기
    $("#player-summary-section").addClass("hidden");       // [변경]
    $("#recent-matches-section").addClass("hidden");       // [변경]
    $("#player-info-section").removeClass("hidden");       // [변경] 전체 섹션은 보여줌

    $("#tier").text("로딩 중…");                           // [변경] 초기 텍스트
    $("#total-games").text("0");
    $("#win-loss").text("-");
    $("#total-kd").text("0.00");

    // ===== 1) Riot ID -> Account(PUUID) =====
    $.ajax({
        type: "GET",
        url: `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
        headers: { "X-Riot-Token": API_KEY },
        success: function (account) {
            const puuid = account.puuid;

            // ===== 2) PUUID -> 리그(솔랭) =====
            $.ajax({
                type: "GET",
                url: `https://kr.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`,
                headers: { "X-Riot-Token": API_KEY },
                success: function (leagues) {
                    $("#player-summary-section").removeClass("hidden"); // [변경] 요약 카드 보여주기
                    const solo = leagues.find(l => l.queueType === "RANKED_SOLO_5x5");
                    if (solo) {
                        const totalGames = solo.wins + solo.losses;
                        const winRate = totalGames ? ((solo.wins / totalGames) * 100).toFixed(1) : "0.0";

                        // 티어 텍스트
                        const tierText = `${solo.tier} ${solo.rank}`;

                        // 티어 이미지 경로 (Flask url_for 사용 시)
                        const tierImg = `<img src="/static/img/${solo.tier.toLowerCase()}.webp" 
                           alt="${solo.tier}" 
                           style="width:100px;">`;

                        // 티어 + 이미지 함께 표시
                        $("#tier-img").html(tierImg); // [변경] 티어 이미지 삽입
                        $("#tier").html(`${tierText}`);

                        $("#total-games").text(totalGames);
                        $("#win-loss").text(`${solo.wins}승 / ${solo.losses}패 (${winRate}%)`);
                    } else {
                        $("#tier").text("전적 없음");
                        $("#total-games").text("0");
                        $("#win-loss").text("-");
                    }


                    // ===== 3) PUUID -> 최근 매치 ID (10개로 축소) =====
                    $.ajax({
                        type: "GET",
                        url: `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?start=0&count=${MATCH_COUNT}`,
                        headers: { "X-Riot-Token": API_KEY },
                        success: function (matchIds) {
                            const usedCount = Math.min(MATCH_COUNT, matchIds.length);

                            // 라벨 업데이트 (오른쪽 평균 요약)
                            $("#avg-range-label").text(`최근 ${usedCount}게임 기준`);
                            // (선택) 왼쪽 카드에도 표시하고 싶으면:
                            $("#sum-range-label").text(`최근 ${usedCount}게임 기준`);

                            let index = 0;
                            let aggKills = 0, aggDeaths = 0, aggAssists = 0, aggCS = 0, wins = 0; // CS/승률까지 원하면 추가

                            function processMatch() {
                                if (index >= matchIds.length) {

                                    // 여기서 승률 계산해서 도넛 업데이트
                                    const winRate = ((wins / matchIds.length) * 100).toFixed(1);
                                    $("#avg-winrate").text(winRate + "%");
                                    $("#avg-donut").css("background",
                                        `conic-gradient(#60a5fa 0% ${winRate}%, #ef4444 ${winRate}% 100%)`
                                    );
                                    return;
                                }

                                const matchId = matchIds[index];
                                $.ajax({
                                    type: "GET",
                                    url: `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`,
                                    headers: { "X-Riot-Token": API_KEY },
                                    success: function (match) {
                                        const info = match.info;
                                        const player = info.participants.find(p => p.puuid === puuid);

                                        // 누적/평균 갱신 (원하는 값만 사용)
                                        const k = player.kills, d = player.deaths, a = player.assists;
                                        const cs = player.totalMinionsKilled + player.neutralMinionsKilled;
                                        aggKills += k;
                                        aggDeaths += d;
                                        aggAssists += a;
                                        aggCS += cs;

                                        // 평균 계산
                                        const gamesSoFar = index + 1;
                                        const avgKills = (aggKills / gamesSoFar).toFixed(1);
                                        const avgDeaths = (aggDeaths / gamesSoFar).toFixed(1);
                                        const avgAssists = (aggAssists / gamesSoFar).toFixed(1);
                                        const avgCS = (aggCS / gamesSoFar).toFixed(1);
                                        const avgKDA = ((aggKills + aggAssists) / Math.max(1, aggDeaths)).toFixed(2);

                                        // DOM 업데이트
                                        $("#avg-kills").text(avgKills);
                                        $("#avg-deaths").text(avgDeaths);
                                        $("#avg-assists").text(avgAssists);
                                        $("#avg-cs").text(avgCS);
                                        $("#avg-kda").text(avgKDA);

                                        if (player.win) wins++;


                                        $("#total-kd").text(avgKDA); // 기존 오른쪽 KDA 카드 갱신

                                        // 매치 정보
                                        const queueTypes = {
                                            420: "솔로 랭크",
                                            430: "일반",
                                            440: "자유 랭크",
                                            450: "칼바람",
                                            700: "격전",
                                            830: "봇(초급)",
                                            840: "봇(중급)",
                                            850: "봇(상급)",
                                            900: "URF",
                                            1900: "AR(무작위) URF",
                                            1700: "아레나",
                                        };
                                        const gameMode = queueTypes[info.queueId] || "기타";

                                        // 카드 렌더 (아군만)
                                        const teammates = info.participants
                                            .filter(p => p.teamId === player.teamId && p.puuid !== puuid)
                                            .map(p => `${p.riotIdGameName || "Unknown"}#${p.riotIdTagline || "Unknown"}`);

                                        const version = "14.16.1"; // 최신 버전

                                        // 내 정보
                                        const myChamp = player.championName;
                                        const myChampImg = `<img src="https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${myChamp}.png"
                                                        alt="${myChamp}" title="${myChamp}"
                                                        style="width:50px;height:50px;border-radius:5px;border:2px solid yellow;">`;

                                        // 우리팀 (나 제외)
                                        const myTeamData = info.participants.filter(p => p.teamId === player.teamId && p.puuid !== puuid);
                                        const myTeamImgs = myTeamData.map(p => {
                                            const champ = p.championName;
                                            return `<img src="https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ}.png"
                                                    alt="${champ}" title="${champ}"
                                                    style="width:21px;border-radius:5px;">`;
                                        }).join("");

                                        const card = `
                      <article class="relative rounded-lg shadow ${player.win ? 'bg-emerald-900/20' : 'bg-rose-900/20'}">
                        <div class="absolute left-0 top-0 h-full w-1 ${player.win ? 'bg-emerald-400' : 'bg-rose-400'}"></div>
                        <div class="px-3 py-2 text-white">
                          <div class="flex items-center justify-between text-xs text-slate-300">
                            <div>${gameMode} · ${new Date(info.gameCreation).toLocaleString()} · ${player.win ? '승리' : '패배'}</div>
                            <div>플레이타임 ${(info.gameDuration / 60).toFixed(1)}분</div>
                          </div>

                          <!-- 초상화 + 스코어 -->
                          <div class="flex items-center">
                            <div class="mt-2 flex items-start gap-3">
                              ${myChampImg}
                              <div class="w-[320px]">
                                <div class="text-sm font-semibold">${k} / ${d} / ${a}</div>
                                <div class="text-xs text-slate-300">CS ${cs}</div>
                              </div>
                            </div>
                            <!-- (1) 초상화와 닉네임을 같은 줄에 -->
                            <div class="h-[100px] mt-2 flex items-center gap-2">
                              <div class="flex flex-col items-center gap-1">
                                ${myTeamImgs}
                              </div>
                              <div class="flex flex-col gap-x-3 gap-y-1 text-xs text-slate-300">
                                ${teammates.map(n => `<span class="truncate max-w-[120px]">${n}</span>`).join('')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>`;
                                        $("#match-list").append(card);

                                        index++;
                                        setTimeout(processMatch, 100);
                                    },
                                    error: function () {
                                        index++;
                                        setTimeout(processMatch, 100);
                                    }
                                });
                            }
                            processMatch();
                        }
                    });
                }
            });
        }
    });
}