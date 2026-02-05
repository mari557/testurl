Deno.serve(async (req) => {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("사용법: https://본인주소/?url=https://mail.naver.com");
  }

  try {
    const originUrl = new URL(targetUrl);
    
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    });

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      let html = await response.text();
      
      // 1. <head> 태그 바로 뒤에 <base> 태그 삽입 (가장 중요)
      // 이 한 줄로 대부분의 이미지, CSS 경로 문제가 해결됩니다.
      const baseTag = `<base href="${originUrl.origin}/">`;
      html = html.replace("<head>", `<head>${baseTag}`);

      // 2. (선택사항) 기존 정규식 대신 더 포괄적인 치환이 필요할 수 있으나, 
      // <base> 태그를 쓰면 굳이 src/href를 일일이 바꿀 필요가 없습니다.

      return new Response(html, {
        headers: { 
          "content-type": "text/html; charset=utf-8",
          // 보안 정책 우회를 위해 CSP 헤더 등을 제거하거나 수정할 필요가 있을 수 있음
        }
      });
    }

    // 리소스(이미지 등) 중계 시 CORS 허용
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  } catch (e) {
    return new Response("중계 오류: " + e.message, { status: 500 });
  }
});
