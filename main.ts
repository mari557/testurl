Deno.serve(async (req) => {
  const url = new URL(req.url);
  const encodedUrl = url.searchParams.get("url");

  // 1. 파라미터가 없으면 안내 메시지 출력
  if (!encodedUrl) {
    return new Response("사용법: ?url=[Base64_Encoded_URL]\n예: ?url=aHR0cHM6Ly93d3cubm90aW9uLnNv", { status: 400 });
  }

  try {
    // 2. Base64 주소 복호화 (보안 장비의 키워드 필터링 우회)
    const targetUrl = atob(encodedUrl);
    const originUrl = new URL(targetUrl);

    // 3. 서버가 노션에 대신 접속
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    });

    const contentType = response.headers.get("content-type") || "";

    // 4. HTML 콘텐츠 처리 (상대 경로를 절대 경로로 치환하여 화면 깨짐 방지)
    if (contentType.includes("text/html")) {
      let html = await response.text();
      
      // 정규식을 이용해 src, href의 상대 경로 앞에 노션 원본 주소를 삽입
      html = html.replace(/(src|href)="\/([^"]*)"/g, `$1="${originUrl.origin}/$2"`);
      
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }

    // 5. 기타 자원(JS, CSS, 이미지) 그대로 전달
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (e) {
    return new Response("접속 또는 디코딩 오류: " + e.message, { status: 500 });
  }
});
