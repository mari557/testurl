Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const targetUrlStr = url.searchParams.get("url");

  if (!targetUrlStr) {
    return new Response("사용법: https://[내주소]/?url=https://nid.naver.com/nidlogin.login", {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  try {
    const targetUrl = new URL(targetUrlStr);
    
    // 1. 클라이언트의 쿠키 및 헤더 복사
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("Host", targetUrl.host);
    requestHeaders.set("Origin", targetUrl.origin);
    requestHeaders.set("Referer", targetUrl.origin);
    // User-Agent는 최신 브라우저로 고정하여 차단 방지
    requestHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    // 2. 네이버로 요청 전송 (쿠키 포함)
    const proxyResponse = await fetch(targetUrlStr, {
      method: req.method,
      headers: requestHeaders,
      body: req.body, // POST 요청(로그인 시도 등) 데이터 전달
      redirect: "manual", // 리다이렉트를 서버에서 직접 제어
    });

    const contentType = proxyResponse.headers.get("Content-Type") || "";
    const responseHeaders = new Headers(proxyResponse.headers);

    // [중요] 보안 헤더 제거 및 CORS 허용
    responseHeaders.delete("Content-Security-Policy");
    responseHeaders.delete("X-Frame-Options");
    responseHeaders.delete("Content-Encoding"); 
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    // 3. 네이버의 Set-Cookie 도메인을 현재 내 도메인으로 변환
    // 네이버가 .naver.com으로 굽는 쿠키를 현재 접속한 도메인으로 바꿔줘야 브라우저가 저장합니다.
    const setCookie = proxyResponse.headers.get("set-cookie");
    if (setCookie) {
      const modifiedCookie = setCookie.replace(/Domain=[^;]+/g, `Domain=${url.hostname}`);
      responseHeaders.set("set-cookie", modifiedCookie);
    }

    // 4. HTML 콘텐츠 리라이팅
    if (contentType.includes("text/html")) {
      let html = await proxyResponse.text();

      // 경로 유지를 위한 Base 태그 및 스크립트 주입
      const baseTag = `<base href="${targetUrl.origin}/">`;
      const hookScript = `
        <script>
          // 모든 링크 클릭과 폼 전송을 현재 프록시 서버를 거치도록 가로챔
          document.addEventListener('submit', (e) => {
            const form = e.target;
            const originalAction = new URL(form.action, document.baseURI).href;
            form.action = window.location.origin + "/?url=" + encodeURIComponent(originalAction);
          });
        </script>
      `;
      
      html = html.replace("<head>", `<head>${baseTag}${hookScript}`);
      
      // 내부 절대 경로를 프록시 경로로 치환
      html = html.replace(/https:\/\/(www|ssl|static|nid|mail)\.naver\.com/g, `${url.origin}/?url=https://$1.naver.com`);

      return new Response(html, {
        status: proxyResponse.status,
        headers: responseHeaders,
      });
    }

    // 5. 리다이렉트(302) 처리
    if (proxyResponse.status >= 300 && proxyResponse.status < 400) {
      const location = proxyResponse.headers.get("location");
      if (location) {
        const newLocation = `${url.origin}/?url=${encodeURIComponent(new URL(location, targetUrl.origin).href)}`;
        responseHeaders.set("location", newLocation);
      }
    }

    // 그 외 리소스는 그대로 중계
    return new Response(proxyResponse.body, {
      status: proxyResponse.status,
      headers: responseHeaders,
    });

  } catch (e) {
    return new Response("Proxy Error: " + e.message, { status: 500 });
  }
});
