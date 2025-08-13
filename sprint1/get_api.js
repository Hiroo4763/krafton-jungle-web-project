function requestAPI() {
    const API_KEY = "...";

    // Riot ID 입력값 가져오기
    var riotID = $("#summoner").val()
    const gameName = riotID.split("#")[0];  // Riot ID 게임 이름
    const tagLine = riotID.split("#")[1];   // Riot ID 태그라인

    console.log("Riot ID:", riotID);
    console.log("게임 이름:", gameName);
    console.log("태그라인:", tagLine);

    // 1. Riot ID → PUUID
    $.ajax({
        type: "GET",
        url: `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
        headers: { "X-Riot-Token": API_KEY },
        success: function (account) {
            const puuid = account.puuid;
            console.log("PUUID:", puuid);

            // 2. Summoner ID → 리그 데이터(솔로랭크)
            $.ajax({
                type: "GET",
                url: `https://kr.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`,
                headers: { "X-Riot-Token": API_KEY },
                success: function (leagues) {
                    const solo = leagues.find(l => l.queueType === "RANKED_SOLO_5x5");
                    if (solo) {
                        const totalGames = solo.wins + solo.losses;
                        const winRate = ((solo.wins / totalGames) * 100).toFixed(1);

                        // HTML 요소에 값 채우기
                        $("#tier").text(`${solo.tier} ${solo.rank}`);
                        $("#win-loss").text(`${solo.wins}승 / ${solo.losses}패 (${winRate}%)`);
                    } else {
                        $("#tier").text("전적 없음");
                        $("#win-loss").text("-");
                    }

                    // 3. PUUID → 최근 5매치 ID
                    $.ajax({
                        type: "GET",
                        url: `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?start=0&count=5`,
                        headers: { "X-Riot-Token": API_KEY },
                        success: function (matchIds) {
                            console.log("최근 매치 ID:", matchIds);

                            // 4. 각 매치 상세 조회 (순차적으로 요청하여 API 제한 회피)
                            let index = 0;
                            function processMatch() {
                                if (index >= matchIds.length) return;

                                const matchId = matchIds[index];
                                $.ajax({
                                    type: "GET",
                                    url: `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`,
                                    headers: { "X-Riot-Token": API_KEY },
                                    success: function (match) {
                                        const info = match.info;
                                        const player = info.participants.find(p => p.puuid === puuid);

                                        console.log(`매치 ${matchId}:`);
                                        console.log("게임 날짜:", new Date(info.gameCreation).toLocaleString());
                                        console.log("플레이타임:", (info.gameDuration / 60).toFixed(1) + "분");
                                        console.log("승패:", player.win ? "승" : "패");
                                        console.log("챔피언:", player.championName || "알 수 없음");
                                        console.log("K/D/A:", `${player.kills}/${player.deaths}/${player.assists}`);
                                        console.log("KDA:", ((player.kills + player.assists) / Math.max(1, player.deaths)).toFixed(2));
                                        console.log("총 CS:", player.totalMinionsKilled + player.neutralMinionsKilled);

                                        // 팀원 정보 (null 체크 추가)
                                        const teammates = info.participants
                                            .filter(p => p.teamId === player.teamId && p.puuid !== puuid)
                                            .map(p => {
                                                const gameName = p.riotIdGameName || "Unknown";
                                                const tagline = p.riotIdTagline || "Unknown";
                                                return `${gameName}#${tagline}`;
                                            });
                                        console.log("같이 한 팀원:", teammates);
                                        console.log("---");

                                        index++;
                                        // 다음 매치 처리를 위한 지연 (API 제한 회피)
                                        setTimeout(processMatch, 100);
                                    },
                                    error: function (xhr, status, error) {
                                        console.error(`매치 ${matchId} 상세 요청 실패:`, xhr.status, error);
                                        index++;
                                        setTimeout(processMatch, 100);
                                    }
                                });
                            }
                            processMatch();
                        },
                        error: err => console.error("매치 ID 요청 실패:", err)
                    });
                },
                error: err => console.error("리그 데이터 요청 실패:", err)
            });
        },
        error: err => console.error("소환사 정보 요청 실패:", err)
    });
    error: err => console.error("PUUID 요청 실패:", err)
};
