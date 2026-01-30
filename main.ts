Deno.serve(async (req) => {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("사용법: ?url=https://target.com");
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    });

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      let html = await response.text();
      const origin = new URL(targetUrl).origin;

      // <head> 바로 뒤에 <base> 태그를 삽입하여 모든 상대 경로를 타겟 서버로 강제 매칭
      const baseTag = `<base href="${origin}/">`;
      html = html.replace("<head>", `<head>${baseTag}`);

      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (e) {
    return new Response("접속 오류: " + e.message, { status: 500 });
  }
});
