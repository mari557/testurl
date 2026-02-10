Deno.serve(async (req) => {
  const url = new URL(req.url);
  const host = url.origin;
  const targetOrigin = "https://www.notion.so";

  // 1. [강화된 이미지 보정 로직] /_next/image 요청 처리
  if (url.pathname.startsWith("/_next/image")) {
    const targetImageUrl = url.searchParams.get("url");
    if (targetImageUrl) {
      // 상대 경로면 노션 주소를 붙이고, 절대 경로면 그대로 사용
      const finalImageUrl = targetImageUrl.startsWith("/") 
        ? `${targetOrigin}${targetImageUrl}` 
        : targetImageUrl;
      
      const imgRes = await fetch(finalImageUrl, {
        headers: { "User-Agent": req.headers.get("user-agent") || "" }
      });
      return new Response(imgRes.body, {
        headers: { 
          "content-type": imgRes.headers.get("content-type") || "image/png",
          "access-control-allow-origin": "*" 
        }
      });
    }
  }

  // 2. 기타 정적 자원 처리 (JS, CSS 등)
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/front-static/")) {
    const assetUrl = `${targetOrigin}${url.pathname}${url.search}`;
    return fetch(assetUrl, {
      headers: { "User-Agent": req.headers.get("user-agent") || "" }
    });
  }

  // 3. 메인 우회 접속 로직 (Base64)
  const targetEncoded = url.searchParams.get("url");
  if (!targetEncoded) return new Response("URL 파라미터
