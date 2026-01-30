Deno.serve(async (req) => {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("사용법: ?url=https://target.com");
  }

  try {
    const originUrl = new URL(targetUrl);
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0" } // 실제 브라우저처럼 보이게 설정
    });

    const contentType = response.headers.get("content-type") || "";
    
    // HTML인 경우 내부의 상대 경로를 절대 경로로 치환하여 디자인 깨짐 방지
    if (contentType.includes("text/html")) {
      let html = await response.text();
      // 이미지, CSS, JS 경로 뒤에 타겟 주소를 붙여서 인식하게 함
      html = html.replaceAll('src="/', `src="${originUrl.origin}/`);
      html = html.replaceAll('href="/', `href="${originUrl.origin}/`);
      
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }

    // 그 외 파일(이미지 등)은 그대로 전달
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (e) {
    return new Response("접속 오류: " + e.message, { status: 500 });
  }
});
