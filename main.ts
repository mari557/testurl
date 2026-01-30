Deno.serve(async (req) => {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  // 1. 만약 파라미터에 url이 없으면, 현재 경로를 타겟의 상대 경로로 간주함 (핵심!)
  if (!targetUrl) {
    // 세션이나 쿠키에 저장된 이전 타겟 주소가 없다면 에러 리턴
    return new Response("사용법: ?url=https://target.com");
  }

  try {
    const target = new URL(targetUrl);
    
    // 2. 타겟 서버에 대신 요청을 보냄 (브라우저처럼 보이게 헤더 조작)
    const proxyRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "User-Agent": req.headers.get("user-agent") || "Mozilla/5.0",
        "Accept": req.headers.get("accept") || "*/*",
      }
    });

    const contentType = proxyRes.headers.get("content-type") || "";
    let body;

    // 3. HTML인 경우에만 경로를 우리 서버 주소로 강제 치환
    if (contentType.includes("text/html")) {
      let text = await proxyRes.text();
      // 모든 상대 경로(/)를 (우리서버/?url=타겟/경로) 형태로 바꿔서 디자인 파일을 가로챔
      text = text.replace(/(src|href)="\/([^"]*)"/g, `$1="${url.origin}/?url=${target.origin}/$2"`);
      body = text;
    } else {
      // 이미지, CSS 등은 그대로 전달
      body = proxyRes.body;
    }

    return new Response(body, {
      status: proxyRes.status,
      headers: { "content-type": contentType }
    });
  } catch (e) {
    return new Response("Proxy Error: " + e.message, { status: 500 });
  }
});
