// Deno 기반 노션 프록시 테스트 코드
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const encodedTarget = url.searchParams.get("url");

  if (!encodedTarget) {
    return new Response("No URL provided", { status: 400 });
  }

  // 1. Base64 URL 디코딩
  const targetUrl = atob(encodedTarget);
  const origin = new URL(targetUrl).origin;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      },
    });

    let html = await response.text();

    // 2. [핵심] 화면 깨짐 방지를 위한 3단계 경로 치환
    // - 상대 경로(/...)를 노션 원본(https://www.notion.so/...)으로 변경
    html = html.replaceAll('src="/', `src="${origin}/`);
    html = html.replaceAll('href="/', `href="${origin}/`);
    
    // - Next.js 및 정적 자원 경로 수정
    html = html.replaceAll('/_next/', `${origin}/_next/`);
    
    // - 이미지 및 데이터 도메인(adora-cdn.com 등) 보정
    html = html.replaceAll('https://www.notion.so', `http://localhost:8000/?url=${btoa('https://www.notion.so')}`);

    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
});
