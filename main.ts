Deno.serve(async (req) => {
  const url = new URL(req.url);
  const fullSearch = url.search;
  let targetUrl = url.searchParams.get("url");



  // 1. 파라미터가 없는 요청(이미지, API) 자동 경로 복원
  if (!targetUrl) {
    if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/front-static") || url.pathname.startsWith("/front-api")) {
      targetUrl = `https://www.notion.so${url.pathname}${fullSearch}`;
    } else if (url.pathname.startsWith("/gsi/")) {

      // 구글 로그인 관련 자원 중계
      targetUrl = `https://accounts.google.com${url.pathname}${fullSearch}`;
    }
  } else {

    try {
      // Base64 해독 및 일반 주소 처리
      if (!targetUrl.startsWith("http")) targetUrl = atob(targetUrl);
    } catch { /* 일반 주소 유지 */ }
  }



  if (!targetUrl) return new Response("인식할 수 없는 요청입니다.", { status: 400 });



  try {

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "User-Agent": req.headers.get("user-agent") || "Mozilla/5.0",
        "Referer": "https://www.notion.so/",
      },
      body: req.body, // API 요청(POST 등) 시 데이터 전달을 위해 추가
    });

    const contentType = response.headers.get("content-type") || "";

    // HTML 중계 시 모든 도메인 자원을 우리 프록시로 유도
    if (contentType.includes("text/html")) {
      let html = await response.text();

      // 이미지/스크립트 등 상대 경로를 우리 서버 주소로 치환
      html = html.replace(/(src|href)="\/([^"]*)"/g, `$1="${url.origin}/?url=https://www.notion.so/$2"`);
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });

    }

    // 그 외 자원(이미지, API 응답) 전달
    return new Response(response.body, {
      status: response.status,
      headers: { 
        "content-type": contentType,
        "Access-Control-Allow-Origin": "*" 
      },
    });
  } catch (e) {
    return new Response("중계 실패: " + e.message, { status: 500 });
  }
});
