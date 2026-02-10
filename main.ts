Deno.serve(async (req) => {
  const url = new URL(req.url);
  const host = url.origin;
  const targetOrigin = "https://www.notion.so";

  // [추가된 보정 로직] /_next/ 등 정적 자원 요청을 노션으로 직접 연결
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/front-static/")) {
    const assetUrl = `${targetOrigin}${url.pathname}${url.search}`;
    return fetch(assetUrl, {
      headers: { "User-Agent": req.headers.get("user-agent") || "" }
    });
  }

  const targetEncoded = url.searchParams.get("url");
  if (!targetEncoded) return new Response("URL 파라미터가 필요합니다.", { status: 400 });

  let targetUrl = "";
  try {
    targetUrl = atob(targetEncoded);
  } catch {
    return new Response("잘못된 Base64 인코딩입니다.", { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Referer": "https://www.notion.so/",
        "Origin": "https://www.notion.so"
      }
    });

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      let html = await response.text();

      // <base> 태그 삽입 (모든 상대 경로의 기준점을 노션으로 설정)
      const baseTag = `<base href="${targetOrigin}/">`;
      html = html.replace("<head>", `<head>${baseTag}`);

      // 내부 링크 클릭 시 다시 우리 프록시를 타도록 보정
      html = html.replaceAll
