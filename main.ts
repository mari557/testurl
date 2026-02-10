Deno.serve(async (req) => {
  const url = new URL(req.url);
  const host = url.origin;
  const targetOrigin = "https://www.notion.so";

  // 1. [이미지/폰트/정적자원 통합 처리]
  // _next/image, _next/static, front-static 등 모든 정적 자원 경로 대응
  if (
    url.pathname.startsWith("/_next/") || 
    url.pathname.startsWith("/front-static/") ||
    url.pathname.includes(".woff2")
  ) {
    // _next/image의 경우 쿼리스트링의 url 파라미터를 확인
    const nextImageUrl = url.searchParams.get("url");
    let finalAssetUrl = "";

    if (url.pathname.startsWith("/_next/image") && nextImageUrl) {
      finalAssetUrl = nextImageUrl.startsWith("/") 
        ? `${targetOrigin}${nextImageUrl}` 
        : nextImageUrl;
    } else {
      // 일반적인 정적 자원은 노션 원본 주소와 결합
      finalAssetUrl = `${targetOrigin}${url.pathname}${url.search}`;
    }

    try {
      const assetRes = await fetch(finalAssetUrl, {
        headers: { "User-Agent": req.headers.get("user-agent") || "" }
      });
      
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

  // 2. [메인 페이지 접속 로직]
  const targetEncoded = url.searchParams.get("url");
  if (!targetEncoded) return new Response("접속할 URL(Base64)을 입력하세요.", { status: 400 });

  try {
    const targetUrl = atob(targetEncoded);
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Referer": "https://www.notion.so/",
      }
    });

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      let html = await response.text();
      
      // <base> 태그는 주소창
