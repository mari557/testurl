import { copy } from "https://deno.land/std@0.210.0/streams/mod.ts";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  // 쿼리 파라미터에서 목적지 URL 추출
  let targetUrlStr = url.searchParams.get("url");

  if (!targetUrlStr) {
    return new Response("사용법: https://내주소/?url=https://nid.naver.com/nidlogin.login", {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  try {
    const targetUrl = new URL(targetUrlStr);

    // 1. 요청 헤더 복제 및 변조 (보안 솔루션 우회의 핵심)
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("Host", targetUrl.host);
    requestHeaders.set("Origin", targetUrl.origin);
    requestHeaders.set("Referer", targetUrl.origin);
    // 브라우저처럼 보이게 하여 차단 회피
    requestHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    // 2. 타겟 사이트(네이버 등)에 실제 요청 전송
    const proxyResponse = await fetch(targetUrlStr, {
      method: req.method,
      headers: requestHeaders,
      body: req.method !== "GET" && req.method !== "HEAD" ? req.body : null,
      redirect: "manual", // 리다이렉트를 서버에서 가로채서 주소창 유지
    });

    const contentType = proxyResponse.headers.get("Content-Type") || "";
    const responseHeaders = new Headers(proxyResponse.headers);

    // 3. 브라우저 보안 정책(CSP, X-Frame) 강제 제거
    responseHeaders.delete("Content-Security-Policy");
    responseHeaders.delete("X-Frame-Options");
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    // 4. 쿠키 도메인 변조 (핵심: 네이버 쿠키를 내 도메인 쿠키로 바꿈)
    const setCookies = proxyResponse.headers.getSetCookie();
    if (setCookies.length > 0) {
      responseHeaders.delete("set-cookie");
      setCookies.forEach(cookie => {
        // Domain=.naver.com 같은 설정을 현재 내 도메인으로 변경하여 브라우저에 저장 유도
        const modifiedCookie = cookie.replace(/Domain=[^;]+/gi, `Domain=${url.hostname}`);
        responseHeaders.append("set-cookie", modifiedCookie);
      });
    }

    // 5. 리다이렉트 주소 가로채기
    if (proxyResponse.status >= 300 && proxyResponse.status < 400) {
      const location = proxyResponse.headers.get("location");
      if (location) {
        const absoluteLocation = new URL(location, targetUrl.origin).href;
        responseHeaders.set("location", `${url.origin}/?url=${encodeURIComponent(absoluteLocation)}`);
      }
    }

    // 6. HTML 내 리소스 경로 및 링크 수정
    if (contentType.includes("text/html")) {
      let html = await proxyResponse.text();

      // <base> 태그 삽입으로 상대 경로 자동 해결
      const baseTag = `<base href="${targetUrl.origin}/">`;
      // 모든 네이버 관련 절대 경로 링크를 내 프록시 서버 주소로 치환
      const rewrittenHtml = html
        .replace("<head>", `<head>${baseTag}`)
        .replace(/https?:\/\/(www|ssl|static|nid|mail)\.naver\.com/g, (match) => {
          return `${url.origin}/?url=${encodeURIComponent(match)}`;
        });

      return new Response(rewrittenHtml, {
        status: proxyResponse.status,
        headers: responseHeaders,
      });
    }

    // 7. 이미지, JS, CSS 등 기타 리소스 중계
    return new Response(proxyResponse.body, {
      status: proxyResponse.status,
      headers: responseHeaders,
    });

  } catch (e) {
    return new Response("중계 오류: " + e.message, { status: 500 });
  }
});
