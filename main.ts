Deno.serve(async (req) => {
  const url = new URL(req.url);
  const host = url.origin;
  const targetOrigin = "https://www.notion.so";

  // 1. 정적 자원(JS, 이미지, 폰트) 요청 감지 및 중계
  // 경로에 확장자가 있거나 특정 폴더(_next, front-static)인 경우
  const isAsset = 
    url.pathname.startsWith("/_next/") || 
    url.pathname.startsWith("/front-static/") ||
    /\.(js|css|woff2|png|jpg|jpeg|svg|gif|ico|json)$/.test(url.pathname);

  if (isAsset) {
    const nextImageUrl = url.searchParams.get("url");
    let finalAssetUrl = nextImageUrl && url.pathname.includes("/_next/image")
      ? (nextImageUrl.startsWith("/") ? `${targetOrigin}${nextImageUrl}` : nextImageUrl)
      : `${targetOrigin}${url.pathname}${url.search}`;

    try {
      // [핵심] 노션 서버가 거부하지 못하도록 헤더를 완벽하게 모방
      const assetRes = await fetch(finalAssetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "*/*",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          "Referer": "https://www.notion.so/",
          "Origin": "https://www.notion.so",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site"
        }
      });

      // 응답 헤더 재구성 (브라우저의 CORS 차단 해제)
      const newHeaders = new Headers(assetRes.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      newHeaders.delete("Content-Security-Policy"); // 보안 정책 해제

      return new Response(assetRes.body, {
        status: assetRes.status,
        headers: newHeaders
      });
