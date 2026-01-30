Deno.serve(async (req) => {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("사용법: https://본인주소/?url=https://docs.google.com");
  }

  try {
    const originUrl = new URL(targetUrl);
    
    // 1. 서버가 브라우저인 척하며 타겟 사이트에 대신 접속
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    });

    const contentType = response.headers.get("content-type") || "";

    // 2. HTML 콘텐츠인 경우 내부 경로 세탁 (주소창 고정 핵심 로직)
    if (contentType.includes("text/html")) {
      let html = await response.text();
      
      // 모든 상대 경로(/style.css 등)를 타겟의 절대 경로로 변환하여 깨짐 방지
      html = html.replace(/(src|href)="\/([^"]*)"/g, `$1="${originUrl.origin}/$2"`);
      
      // 만약 내부 클릭 시에도 주소창을 유지하고 싶다면 아래 주석 해제 (복잡해짐)
      // html = html.replace(/(href)="https?:\/\/[^"]*"/g, `$1="${url.origin}/?url=$&"`);

      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }

    // 3. 이미지나 CSS 등은 그대로 중계
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (e) {
    return new Response("중계 오류: " + e.message, { status: 500 });
  }
});
