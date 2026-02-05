import { Buffer } from "node:buffer";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const encodedUrl = url.searchParams.get("url");

  if (!encodedUrl) {
    return new Response("사용법: ?url=" + Buffer.from("https://mail.naver.com").toString("base64"));
  }

  try {
    const decodedUrl = Buffer.from(encodedUrl, "base64").toString("utf-8");
    const targetUrl = new URL(decodedUrl);

    // 1. 요청 헤더 설정 (Cloudflare 차단 방지를 위해 최대한 브라우저처럼 위장)
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("Host", targetUrl.host);
    requestHeaders.set("Origin", targetUrl.origin);
    requestHeaders.set("Referer", targetUrl.origin);

    const response = await fetch(decodedUrl, {
      method: req.method,
      headers: requestHeaders,
      body: req.method !== "GET" && req.method !== "HEAD" ? req.body : null,
      redirect: "manual",
    });

    const contentType = response.headers.get("Content-Type") || "";
    const responseHeaders = new Headers(response.headers);
    
    // CORS 및 보안 헤더 해제
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.delete("Content-Security-Policy");
    responseHeaders.delete("X-Frame-Options");

    // 2. HTML 내부에 강력한 가로채기(Hooking) 스크립트 주입
    if (contentType.includes("text/html")) {
      let html = await response.text();
      const baseTag = `<base href="${targetUrl.origin}/">`;
      
      const hookScript = `
        <script>
          (function() {
            // 1. 브라우저의 기본 fetch를 가로챔 (API 요청 우회 핵심)
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
              let resource = args[0];
              if (typeof resource === 'string' && (resource.includes('upbit.com') || resource.startsWith('/'))) {
                const absoluteUrl = new URL(resource, '${targetUrl.origin}').href;
                // 모든 API 요청을 다시 내 프록시 서버 주소로 변환
                resource = window.location.origin + "/?url=" + btoa(absoluteUrl);
              }
              return originalFetch(resource, args[1]);
            };

            // 2. 모든 링크 클릭 시 Base64 인코딩 적용
            document.addEventListener('click', (e) => {
              const a = e.target.closest('a');
              if (a && a.href && a.href.startsWith('http')) {
                e.preventDefault();
                window.location.href = window.location.origin + "/?url=" + btoa(a.href);
              }
            }, true);
          })();
        </script>
      `;

      html = html.replace("<head>", "<head>" + baseTag + hookScript);
      return new Response(html, { headers: responseHeaders });
    }

    // 이미지, JS, CSS 등 리소스 중계
    return new Response(response.body, { status: response.status, headers: responseHeaders });

  } catch (e) {
    return new Response("업비트 접속 오류: " + e.message, { status: 500 });
  }
});
