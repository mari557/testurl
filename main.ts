Deno.serve(async (req) => {
  const url = new URL(req.url);
  // 전체 쿼리 스트링을 추출하여 이중 URL 구조 대응
  const fullSearch = url.search;
  let targetUrl = url.searchParams.get("url");

  // [보완] 파라미터가 없거나 특정 CDN 경로인 경우 대응
  if (!targetUrl) {
    if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/front-static")) {
      targetUrl = `https://www.notion.so${url.pathname}${fullSearch}`;
    }
  } else {
    try {
      // Base64 해독 시도 및 일반 URL 처리
      if (!targetUrl.startsWith("http")) targetUrl = atob(targetUrl);
    } catch { /* 일반 URL인 경우 유지 */ }
  }

  // [추가] 외부 CDN(adora-cdn) 요청 처리 로직
  if (url.href.includes("adora-cdn.com")) {
     targetUrl = url.href.replace(url.origin, "https://c.adora-cdn.com");
  }

  if (!targetUrl) return new Response("경로 인식 불가", { status: 400 });

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.notion.so/",
      }
    });

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      let html = await response.text();
      // 모든 상대 경로 및 주요 CDN 도메인을 우리 서버로 우회하도록 치환
      html = html.replace(/(src|href)="\/([^"]*)"/g, `$1="${url.origin}/?url=https://www.notion.so/$2"`);
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    return new Response(response.body, {
      status: response.status,
      headers: { "content-type": contentType, "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response("중계 에러: " + e.message, { status: 500 });
  }
});
