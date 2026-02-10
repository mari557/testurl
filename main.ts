Deno.serve(async (req) => {
  const url = new URL(req.url);
  const host = url.origin;
  const targetOrigin = "https://www.notion.so";

  // 1. 모든 정적 자원(JS, 이미지, 폰트, CDN) 처리 로직
  // 노션이 사용하는 다양한 도메인의 자원들을 통합 관리합니다.
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
          "Origin": "https://www.notion.so"
        }
      });

      const newHeaders = new Headers(assetRes.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      // 보안 정책으로 인한 차단 방지
      newHeaders.delete("Content-Security-Policy");

      return new Response(assetRes.body, { status: assetRes.status, headers: newHeaders });
    } catch {
      return new Response("Asset Error", { status: 502 });
    }
  }

  // 2. 메인 페이지 접속 로직 (send_to 경로 처리)
  const targetEncoded = url.searchParams.
