const puppeteer = require('puppeteer');
const express = require('express');
const app = express();

app.get('/proxy', async (req, res) => {
    const encodedUrl = req.query.url;
    if (!encodedUrl) return res.send('No URL provided');

    // 1. Base64 URL 디코딩
    const targetUrl = Buffer.from(encodedUrl, 'base64').toString('utf8');

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // 2. 대상 사이트(Notion) 접속
        await page.goto(targetUrl, { waitUntil: 'networkidle2' });

        // 3. 페이지 내 절대 경로 및 외부 자원을 현재 프록시 서버를 거치도록 치환
        let content = await page.content();
        
        // 정적 자원(JS, CSS, CDN) 경로 보정
        content = content.replace(/https:\/\/www\.notion\.so/g, `http://localhost:3000/proxy?url=${Buffer.from('https://www.notion.so').toString('base64')}`);
        content = content.replace(/https:\/\/adora-cdn\.com/g, `http://localhost:3000/proxy?url=${Buffer.from('https://adora-cdn.com').toString('base64')}`);
        
        // 4. 링크 클릭 시 다시 Base64로 감싸서 요청하도록 스크립트 삽입 (Client-side)
        const injectionScript = `
            <script>
                document.querySelectorAll('a').forEach(link => {
                    link.onclick = (e) => {
                        e.preventDefault();
                        const target = btoa(link.href);
                        window.location.href = '/proxy?url=' + target;
                    };
                });
            </script>
        `;

        res.send(content + injectionScript);
    } catch (error) {
        res.status(500).send('Error loading page: ' + error.message);
    } finally {
        await browser.close();
    }
});

app.listen(3000, () => console.log('Proxy server running on port 3000'));
