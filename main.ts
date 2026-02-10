Deno.serve(async (req) => {
  const url = new URL(req.url);
  const targetEncoded = url.searchParams.get("url");
  const host = url.origin; // 현재 접속 도메인 (예: https://mari557-testurl-96.deno.dev)

  if (!targetEncoded) return new Response("URL 매개변수가 없습니다.", { status: 400 });

  try {
    const targetUrl = atob(targetEncoded);
    const origin = new URL(targetUrl).origin;

    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
    });

    const contentType = res.headers.get("content-type") || "";
    
    // HTML이 아닌 자원(이미지, CSS 등)은 그대로 반환
    if (!contentType.includes("text/html")) {
      return new Response(res.body, { headers: { "content-type": contentType } });
    }

    let html = await res.text();

    // [핵심] 1. 상대 경로를 절대 경로로 먼저 변환 (중첩 방지)
    html = html.replace(/(src|href)="\/([^/])/g, `$1="${origin}/$2`);

    // [핵심] 2. 모든 notion.so 호출을 현재 프록시 서버로 유도 (Base64 방식)
    // 이미 변환된 주소는 건드리지 않도록 패턴 최적화
    html = html.replace(/https:\/\/www\.notion\.so\/([^\s"'>]+)/g, (match) => {
        return `${host}/send_to?url=${btoa(match)}`;
    });

    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" }
    });
  } catch (e) {
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
});
