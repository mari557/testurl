Deno.serve(async (req) => {
  const url = new URL(req.url);
  const fullSearch = url.search;
  let targetUrl = url.searchParams.get("url");

  // [핵심] URL 파라미터가 없어도 경로를 보고 목적지를 강제 추정
  if (!targetUrl) {
    if (url.pathname.includes("_next") || url.pathname.includes("front-")) {
      targetUrl = `https://www.notion.so${url.pathname}${fullSearch}`;
    } else if (url.pathname.includes("images.ctfassets.net")) {
      targetUrl = `https://images.ctfassets.net${url.pathname.replace('/images.ctfassets.net', '')}${fullSearch}`;
    } else {
      // 그 외 알 수 없는 경로는 일단 노션 메인으로 연결 시도
      targetUrl = `https://www.notion.so${url.pathname}${fullSearch}`;
    }
  } else {
    try {
      if (!targetUrl.startsWith("http")) targetUrl = atob(targetUrl);
    } catch { /* 일반 주소 유지 */ }
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.notion.so/",
      },
      body: req.method !== "GET" && req.method !== "HEAD" ? await req.blob() : null,
    });

    const contentType = response.headers.get("content-type") || "";

    // HTML 응답 시 내부 모든 도메인 주소를 우리 서버로 강제 치환
    if (contentType.includes("text/html")) {
      let html = await response.text();
      // 1. 상대 경로 치환
      html = html.replace(/(src|href)="\/([^"]*)"/g, `$1="${url.origin}/?url=https://www.notion.so/$2"`);
      // 2. 노션 도메인 직접 호출 치환
      html = html.replace(/https:\/\/www\.notion\.so/g, `${url.origin}/?url=https://www
