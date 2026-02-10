Deno.serve(async (req) => {
  const url = new URL(req.url);
  const targetEncoded = url.searchParams.get("url");
  const host = url.origin;

  // 1. 타겟 URL 디코딩
  if (!targetEncoded) return new Response("URL 파라미터가 필요합니다.", { status: 400 });
  let targetUrl = "";
  try {
    targetUrl = atob(targetEncoded);
  } catch {
    return new Response("잘못된 Base64 인코딩입니다.", { status: 400 });
  }

  const targetOrigin = new URL(targetUrl).origin;

  try {
    // 2. 노션 서버에 요청 (헤더 조작으로 차단 우회)
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Referer": "https://www.notion.so/",
        "Origin": "https://www.notion.so"
      }
    });

    const contentType = response.headers.get("content-type") || "";

    // 3. HTML 데이터인 경우 경로 치환 (CSS/JS 로딩 보장)
    if (contentType.includes("text/html")) {
      let html = await response.text();

      // <base> 태그 삽입: 브라우저가 모든 상대 경로를 노션 서버에서 직접 찾게 만듭니다 (가장 확실한 방법)
      const baseTag = `<base href="${targetOrigin}/">`;
      html = html.replace("<head>", `<head>${baseTag}`);

      // 스크립트 내 도메인 강제 치환
      html = html.replaceAll("https://www.notion.so", host + "/send_to?url=" + btoa("https://www.notion.so"));

      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }

    // 4. 이미지, CSS 등 기타 자원은 원본 그대로 전달 (Proxying)
    return new Response(response.body, {
      headers: {
        "content-type": contentType,
        "access-control-allow-origin": "*" // CORS 에러 방지
      }
    });

  } catch (
