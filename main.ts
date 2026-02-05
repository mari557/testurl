Deno.serve(async (req) => {
  const url = new URL(req.url);
  let targetUrl = url.searchParams.get("url");

  // [핵심 보완] 파라미터가 없는 상대 경로 요청 처리
  if (!targetUrl) {
    // 요청 경로가 노션의 자원 경로 패턴인 경우 강제로 노션 주소와 결합
    if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/front-static")) {
      targetUrl = `https://www.notion.so${url.pathname}${url.search}`;
    }
  } else {
    // Base64 인코딩 처리 (에러 방지용 try-catch)
    try {
      if (!targetUrl.startsWith("http")) {
        targetUrl = atob(targetUrl);
      }
    } catch { /* 일반 URL인 경우 그대로 진행 */ }
  }

  if (!targetUrl) return new Response("URL 파라미터가 없습니다.", { status: 400 });

  try {
    const originUrl = new URL(targetUrl);
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.notion.so/", // 레퍼러 체크 우회
      }
    });

    const contentType = response.headers.get("content-type") || "";

    // HTML 응답일 경우 내부 링크 세탁
    if (contentType.includes("text/html")) {
      let html = await response.text();
      // 모든 상대 경로를 우리 프록시 서버 주소를 거치도록 변경
      html = html.replace(/(src|href)="\/([^"]*)"/g, `$1="${url.origin}/?url=${originUrl.origin}/$2"`);
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    // 이미지, JS, CSS 등 리소스 전달
    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": contentType,
        "Access-Control-Allow-Origin": "*", // 브라우저 차단 방지
      },
    });
  } catch (e) {
    return new Response("중계 실패: " + e.message, { status: 500 });
  }
});
