// Deno Deploy용 Proxy 서버 코드
Deno.serve(async (req) => {
  const url = new URL(req.url);
  // URL 파라미터에서 ?url= 다음에 오는 값을 읽음
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("mail.naver.com");
  }

  try {
    const response = await fetch(targetUrl);
    
    // 가져온 데이터(HTML 등)를 사용자 브라우저에 그대로 전달
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (e) {
    return new Response("접속 오류: " + e.message, { status: 500 });
  }
});
