Deno.serve(async (req) => {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  // url 파라미터가 없으면 에러 메시지 출력
  if (!targetUrl) {
    return new Response("사용법: https://본인주소/send_to?url=https://docs.google.com");
  }

  try {
    // 1. 서버가 타겟 페이지에 대신 접속함
    const response = await fetch(targetUrl);
    
    // 2. 응답받은 데이터(Body)를 아무 수정 없이 브라우저에 그대로 던져줌
    // (이렇게 해야 브라우저가 원래 사이트의 자원을 자연스럽게 불러올 확률이 높습니다)
    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "text/html; charset=utf-8",
        // 보안 정책(CORS)을 일시적으로 허용하여 깨짐 최소화 시도
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response("접속 실패: " + e.message, { status: 500 });
  }
});
