Deno.serve(async (req) => {
  const url = new URL(req.url);
  const fullSearch = url.search;
  let targetUrl = url.searchParams.get("url");

  // 1. URL 파라미터가 없는 정적 자원(이미지, API) 처리
  if (!targetUrl) {
    if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/front-")) {
      targetUrl = `https://www.notion.so${url.pathname}${fullSearch}`;
    } else if (url.pathname.startsWith("/gsi/")) {
      targetUrl = `https://accounts.google.com${url.pathname}${fullSearch}`;
    } else if (url.href.includes("images.ctfassets.net")) {
      // 이미지 CDN 대응
      targetUrl = url.href.replace(url.origin, "https://images.ctfassets.net");
    }
  } else {
    try {
      // Base64 해독 시도
      if (!targetUrl.startsWith("http")) targetUrl = atob(targetUrl);
    } catch { /* 일반 URL인 경우 유지 */ }
  }

  if (!targetUrl) return new Response("경로 인식 에러", { status: 400 });

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.notion.so/",
      },
      body: req.body,
    });

    const contentType = response.headers.get("content-type") || "";

    // HTML 내의 모든 경로를 우리 서버 주소를 거치도록 강제 세탁
    if (contentType.includes("text/html")) {
      let html = await response.text();
      // 상대 경로(/)와 절대 경로(notion.so) 모두를 우리 프록시 주소로 치환
      html = html.replace(/(src|href)="\/([^"]*)"/g, `$1="${url.origin}/?url=https://www.notion.so/$2"`);
      html = html.replace(/https:\/\/www\.notion\.so/g, `${url.origin}/?url=https://www.notion.so`);
      
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    return new Response(response.body, {
      status: response.status,
      headers: { 
        "content-type": contentType,
        "Access-Control-Allow-Origin": "*", // 브라우저 CORS 에러 방지
      },
    });
  } catch (e) {
    return new Response("중계 실패: " + e.message, { status: 500 });
  }
});
