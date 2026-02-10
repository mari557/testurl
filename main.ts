const puppeteer = require('puppeteer');
const express = require('express');
const app = express();

app.get('/proxy', async (req, res) => {
    const encodedUrl = req.query.url;
    if (!encodedUrl) return res.send('URL을 입력해주세요.');

    const targetUrl = Buffer.from(encodedUrl, 'base64').toString('utf8');

    // 브라우저 실행 (샌드박스 비활성화로 권한 이슈 방지)
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();

    try {
        // [핵심] 모든 네트워크 요청을 가로채서 절대 경로를 유지하도록 설정
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            request.continue();
        });

        // 노션 페이지 접속 및 네트워크 안정화 대기
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle0', // 네트워크 요청이 없을 때까지 대기하여 화면 깨짐 방지
            timeout: 60000 
        });

        // 렌더링된 최종 결과물 가져오기
        const content = await page.content();

        // 1. 모든 상대 경로를 절대 경로(notion.so)로 치환하여 깨짐 방지
        let fixedContent = content.replace(/(src|href)="\/([^/])/g, `$1="https://www.notion.so/$2`);

        // 2. 외부 CDN 및 API 경로 보정
        fixedContent = fixedContent.replace(/https:\/\/www\.notion\.so/g, `http://localhost:3000/proxy?url=${Buffer.from('https://www.notion.so').toString('base64')}`);

        res.set('Content-Type', 'text/html');
        res.send(fixedContent);

    } catch (error) {
        console.error(error);
        res.status(500).send('페이지 로드 중 오류 발생: ' + error.message);
    } finally {
        //
