Deno.serve((req) => {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("사용법: ?url=https://www.naver.com");
  }

  // 302 리다이렉트: 브라우저에게 해당 주소로 직접 이동하라고 명령함
  return Response.redirect(targetUrl, 302);
});
