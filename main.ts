// 실행 명령어: deno run -A --unstable_http [파일명].ts
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { Buffer } from "node:buffer";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const encodedUrl = url.searchParams.get("url");

  // 사용법 안내
  if (!encodedUrl) {
    const example = Buffer.from("https://www.notion.so").toString("base64");
    return new Response(`사용법: ?url=${example}`, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  let browser;
  try {
    // 1. URL 디코딩
    const targetUrl = Buffer.from(encodedUrl, "base64").toString("utf-8");
    console.log(`[Proxy] 접속 시도 중: ${targetUrl}`);

    // 2. 헤드리스 브라우저 실행
    browser = await puppeteer.launch({
      headless: true, // 화면 없이 실행
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
    });

    const page = await browser.newPage();

    // 3. 봇 감지 회피를 위한 User-Agent 설정
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.setViewport({ width: 1280, height: 800 });

    // 4. 페이지 접속 및 렌더링 대기
    // networkidle2: 네트워크 요청이 2개 이하로 줄어들 때까지(로딩 완료 시점) 대기
    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 60000 });

    // 5. 렌더링이 완료된 최종 HTML 추출
    let content = await page.content();

    // 6. 결과물 보정 (경로 및 링크 처리)
    const originUrl = new URL(targetUrl);
    const baseTag = `<base href="${originUrl.origin}/">`;
    
    // 링크 클릭 시 다시 프록시를 타도록 만드는 스크립트 주입
    const injectionScript = `
      <script>
        document.addEventListener('click', e => {
          const a = e.target.closest('a');
          if (a && a.href && a.href.startsWith('http')) {
            e.preventDefault();
            window.location.href = window.location.origin + "/?url=" + btoa(a.href);
          }
        }, true);
      </script>
    `;

    content = content.replace("<head>", `<head>${baseTag}${injectionScript}`);

    return new Response(content, {
      headers: { 
        "content-type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*" 
      },
    });

  } catch (e) {
    console.error(e);
    return new Response(`[오류 발생]: ${e.message}`, { status: 500 });
  } finally {
    // 메모리 누수 방지를 위해 브라우저 종료
    if (browser) await browser.close();
  }
});
