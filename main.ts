import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const encodedUrl = url.searchParams.get("url");

  if (!encodedUrl) {
    return new Response("사용법: ?url=aHR0cHM6Ly93d3cudXBiaXQuY29t");
  }

  let browser;
  try {
    const targetUrl = atob(encodedUrl);

    // [중요] Puppeteer 실행 옵션 강화
    browser = await puppeteer.launch({
      headless: true, // "new"로 설정하면 최신 헤드리스 모드 사용 가능
      args: [
        "--no-sandbox", 
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled" // 봇 감지 회피
      ],
      // 만약 실행 시 에러가 나면 아래 주석을 풀고 로컬 크롬 경로를 직접 입력하세요
      // executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", 
    });

    const page = await browser.newPage();

    // 브라우저 지문 설정
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    // 업비트 접속 (최소 5초 이상 대기하여 JS 렌더링 시간 확보)
    await page.goto(targetUrl, { 
      waitUntil: "networkidle2", 
      timeout: 30000 
    });

    let content = await page.content();
    const baseTag = `<base href="${new URL(targetUrl).origin}/">`;
    content = content.replace("<head>", `<head>${baseTag}`);

    return new Response(content, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    console.error(e); // 터미널에서 상세 오류 확인용
    return new Response(`[렌더링 오류 상세]: ${e.message}`, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
});
