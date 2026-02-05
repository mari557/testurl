import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const encodedUrl = url.searchParams.get("url");

  if (!encodedUrl) {
    return new Response("사용법: ?url=aHR0cHM6Ly93d3cudXBiaXQuY29t");
  }

  try {
    // 1. Base64 URL 디코딩
    const targetUrl = atob(encodedUrl);

    // 2. 헤드리스 브라우저 실행
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // 3. 브라우저인 척 위장 (Fingerprint 우회 핵심)
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.setViewport({ width: 1920, height: 1080 });

    // 4. 업비트 접속 및 대기 (JS가 실행될 시간 확보)
    await page.goto(targetUrl, { waitUntil: "networkidle2" });
    
    // 필요 시 특정 요소가 나타날 때까지 대기
    // await page.waitForSelector('.main_chart', { timeout: 5000 });

    // 5. 렌더링이 끝난 전체 HTML 가져오기
    let content = await page.content();

    // 6. 내부 리소스 경로가 깨지지 않도록 <base> 태그 주입
    const baseTag = `<base href="${new URL(targetUrl).origin}/">`;
    content = content.replace("<head>", `<head>${baseTag}`);

    await browser.close();

    return new Response(content, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    return new Response("렌더링 오류: " + e.message, { status: 500 });
  }
});
