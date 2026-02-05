Deno.serve(async (req) => {
  const url = new URL(req.url);
  const fullSearch = url.search;
  let targetUrl = url.searchParams.get("url");

  // 1. 파라미터가 없는 요청(이미지, API, JS 등) 자동 경로 복원
  if (!targetUrl) {
    // 업비트의 주요 자원 경로 패턴 (_next, static, api 등)
    if (url.pathname.startsWith("/_next") || 
        url.pathname.startsWith("/static") || 
        url.pathname.startsWith("/api") ||
        url.pathname.startsWith("/v1")) {
      targetUrl = `https://www.upbit.com${url.pathname}${fullSearch}`;
    }
  } else {
    try {
      // Base64 해독 시도
      if (!targetUrl.startsWith("http")) targetUrl = atob(targetUrl);
    } catch { /* 일반 주소 유지 */ }
  }

  if (!targetUrl) return new Response("인식할 수 없는 요청입니다.", { status: 400 });

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.upbit.com/",
      },
      // GET/HEAD 요청이 아닐 때만 body 전달
      body: (req.method !== "GET" && req.method !== "HEAD") ? req.body : null,
    });

    const contentType = response.headers.get("content-type") || "";

    // 2. HTML 중계 시 경로 세탁
    if (contentType.includes("text/html")) {
      let html = await response.text();
      // 상대 경로를 우리 프록시 서버 주소로 강제 치환
      html = html.replace(/(src|href)="\/([^"]*)"/g, `$1="${url.origin}/?url=https://www.upbit.com/$2"`);
      
      return new Response(html, { 
        headers: { "content-type": "text/html; charset=utf-8" } 
      });
    }

    // 3. 그 외 자원 전달 (CORS 허용)
    return new Response(response.body, {
      status: response.status,
      headers: { 
        "content-type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  } catch (e) {
    return new Response("중계 실패: " + e.message, { status: 500 });
  }
});
