Deno.serve(async (req) => {
  const url = new URL(req.url);
  let targetUrl = url.searchParams.get("url");

  // 1. 만약 파라미터에 url이 없는데 경로가 /_next/ 등인 경우 (이미지/자원 요청)
  // 이전 요청 정보를 기반으로 노션 주소로 강제 연결 시도
  if (!targetUrl && url.pathname.startsWith("/_next")) {
    targetUrl = `https://www.notion.so${url.pathname}${url.search}`;
  } else if (targetUrl && !targetUrl.startsWith("http")) {
    // Base64인 경우 해독 (atob)
    try { targetUrl = atob(targetUrl); } catch { /* 일반 문자열인 경우 통과 */ }
  }

  if (!targetUrl) {
    return new Response("사용법: ?url=[Base64_Encoded_URL]");
  }

  try {
    const originUrl = new URL(targetUrl);
    
    // 2. 서버가 타겟에 대신 접속
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.notion.so/", // 노션이 자기 사이트인지 확인하므로 필요
      }
    });

    const contentType = response.headers.get("content-type") || "";

    // 3. HTML 내부의 이미지/스크립트 경로를 우리 프록시 주소로 치환
    if (contentType.includes("text/html")) {
      let html = await response.text();
      // 모든 상대 경로를 [우리서버/?url=노션주소/경로] 형태로 세탁
      html = html.replace(/(src|href)="\/([^"]*)"/g, `$1="${url.origin}/?url=${originUrl.origin}/$2"`);
      
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }

    // 4. 이미지나 기타 자원은 원본 그대로 전달
    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": contentType,
        "Access-Control-Allow-Origin": "*",
      }
    });
  } catch (e) {
    return new Response("리소스 중계 오류: " + e.message, { status: 500 });
  }
});
