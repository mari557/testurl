Deno.serve(async (req) => {
  const url = new URL(req.url);
  const host = url.origin;
  const targetOrigin = "https://www.notion.so";

  // 1. 정적 자원(JS, 이미지, 폰트) 중계 로직
  const isAsset = 
    url.pathname.startsWith("/_next/") || 
    url.pathname.startsWith("/front-static/") ||
    /\.(js|css|woff2|png|jpg|jpeg|svg|gif|ico|json)$/.test(url.pathname);

  if (isAsset) {
    const nextImageUrl = url.searchParams.get("url");
    let finalAssetUrl = (url.pathname.includes("/_next/image") && nextImageUrl)
      ? (nextImageUrl.startsWith("/") ? `${targetOrigin}${nextImageUrl}` : nextImageUrl)
      : `${targetOrigin}${url.pathname}${url.search}`;

    try {
      const assetRes = await fetch(finalAssetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Referer": "https://www.notion.so/",
        }
      });
      const newHeaders = new Headers(assetRes.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      return new Response(assetRes.body, { headers: newHeaders });
    } catch {
      return new Response("Asset Error", { status: 502 });
    }
  }

  // 2. 메인 페이지 접속 로직
  const targetEncoded = url.searchParams.get("url");
  
  // [보정] 매개변수가 없는데 경로가 찍혀 들어오는 경우 대응
  if (!targetEncoded) {
    return new Response("매개변수가 유실되었습니다. 초기 주소로 접속하세요.", { status: 400 });
  }

  try {
    const targetUrl = atob(targetEncoded);
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.notion.so/" }
    });

    let html = await response.text();
    
    // [핵심] 1. 브라우저의 모든 이동을 감
