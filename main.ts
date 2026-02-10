Deno.serve(async (req) => {
  const url = new URL(req.url);
  const host = url.origin;
  const targetOrigin = "https://www.notion.so";

  // 1. [강력한 자원 중계 로직]
  // 파일 확장자가 있거나, _next, front-static 경로인 경우 모두 가로채기
  const isAsset = 
    url.pathname.startsWith("/_next/") || 
    url.pathname.startsWith("/front-static/") ||
    /\.(js|css|woff2|png|jpg|jpeg|svg|gif|ico)$/.test(url.pathname);

  if (isAsset) {
    let finalAssetUrl = "";

    // Case A: _next/image 쿼리에 외부 URL이 섞인 경우 (ctfassets.net 등)
    const nextImageUrl = url.searchParams.get("url");
    if (url.pathname.startsWith("/_next/image") && nextImageUrl) {
      finalAssetUrl = nextImageUrl.startsWith("/") 
        ? `${targetOrigin}${nextImageUrl}` 
        : nextImageUrl;
    } else {
      // Case B: 일반적인 내부 자원 (.js, .woff2 등)
      finalAssetUrl = `${targetOrigin}${url.pathname}${url.search}`;
    }

    try {
      const assetRes = await fetch(finalAssetUrl, {
        headers: { 
          "User-Agent": req.headers.get("user-agent") || "Mozilla/5.0",
          "Referer": "https://www.notion.so/" 
        }
      });
      
      // 바이너리 데이터(이미지, 폰트) 보존을 위해 직접 응답 생성
      return new Response(assetRes.body, {
        headers: {
          "content-type": assetRes.headers.get("content-type") || "application/octet-stream",
          "access-control-allow-origin": "*"
        }
      });
    } catch (e) {
      return new Response("Asset Fetch Error", { status: 500 });
    }
  }

  // 2. [메인 페이지 접속 및 HTML 보정]
  const targetEncoded = url.searchParams.get("url");
  if (!targetEncoded) return new Response("접속 주소(url=Base64)가 필요합니다.", { status: 400 });

  try {
    const targetUrl = atob(targetEncoded);
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.notion.so/" }
    });

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      let html = await response.text();
      
      // <base> 태그로 브라우저 기본 경로를 노션으로 고정
      const baseTag = `<base href="${targetOrigin}/">`;
      html = html.replace("<head>", `<head>${baseTag}`);

      // 페이지 내부 링크 클릭 시 우리 프록시를 계속 유지하게 만듦
      const proxyPrefix = `${host}/send_
