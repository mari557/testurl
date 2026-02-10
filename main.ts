Deno.serve(async (req) => {
  const url = new URL(req.url);
  const fullSearch = url.search;
  let targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/front-static") || url.pathname.startsWith("/front-api")) {
      targetUrl = `https://www.notion.so${url.pathname}${fullSearch}`;
    } else if (url.pathname.startsWith("/gsi/")) {
      targetUrl = `https://accounts.google.com${url.pathname}${fullSearch}`;
    }
  } else {
    try {
      if (!targetUrl.startsWith("http")) targetUrl = atob(targetUrl);
    } catch { /* 일반 주소 */ }
  }

  if (!targetUrl) return new Response("인식할 수 없는 요청입니다.", { status: 400 });

  try {
    // GET/HEAD 요청은 body를 포함할 수 없으므로 체크
    const hasBody = !["GET", "HEAD"].includes(req.method);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "User-Agent": req.headers.get("user-agent") || "Mozilla/5.0",
        "Referer": "https://www.notion.so/",
      },
      body: hasBody ? req.body : null, 
    });

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      let html = await response.text();
      // 이 부분이 핵심이었네요! 상대 경로를 우리 도메인의 ?url= 형태로 깔끔하게 맵핑
      html = html.replace(/(src|href)="\/([^"]*)"/g, `$1="${url.origin}/?url=https://www.notion.so/$2"`);
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

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
