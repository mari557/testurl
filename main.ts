import { Buffer } from "node:buffer";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const encodedUrl = url.searchParams.get("url");

  if (!encodedUrl) {
    return new Response("사용법: ?url=" + Buffer.from("https://www.upbit.com").toString("base64"));
  }

  try {
    // 1. Base64로 암호화된 URL 디코딩
    const decodedUrl = Buffer.from(encodedUrl, "base64").toString("utf-8");
    const targetUrl = new URL(decodedUrl);

    // 2. 타겟 사이트에 요청 (헤더 위조)
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("Host", targetUrl.host);
    requestHeaders.set("Origin", targetUrl.origin);
    requestHeaders.set("Referer", targetUrl.origin);
    requestHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    const response = await fetch(decodedUrl, {
      method: req.method,
      headers: requestHeaders,
      redirect: "manual",
    });

    const contentType = response.headers.get("Content-Type") || "";
    const responseHeaders = new Headers(response.headers);

    // 3. 보안 정책 무력화
    responseHeaders.delete("Content-Security-Policy");
    responseHeaders.delete("X-Frame-Options");
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    // 4. HTML 내부의 모든 링크를 다시 Base64로 감싸서 전달 (핵심)
    if (contentType.includes("text/html")) {
      let html = await response.text();
      const baseTag = `<base href="${targetUrl.origin}/">`;
      
      // 화면 깨짐 방지를 위한 도메인 체크 우회 스크립트
      const bypassScript = `
        <script>
          // 모든 클릭 이벤트를 가로채서 목적지 주소를 Base64로 인코딩 후 프록시 전달
          document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href && !link.href.startsWith('javascript')) {
              e.preventDefault();
              const encoded = btoa(link.href);
              window.location.href = window.location.origin + "/?url=" + encoded;
            }
          });
        </script>
      `;

      html = html.replace("<head>", `<head>${baseTag}${bypassScript}`);
      
      return new Response(html, { headers: responseHeaders });
    }

    return new Response(response.body, { status: response.status, headers: responseHeaders });

  } catch (e) {
    return new Response("디코딩 또는 접속 오류: " + e.message, { status: 500 });
  }
});
