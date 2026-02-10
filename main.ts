const express = require('express');
const axios = require('axios');
const app = express();

// 노션의 자원을 대신 가져다주는 핵심 함수
async function proxyRequest(targetUrl) {
    try {
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'arraybuffer', // 이미지, 폰트 등 바이너리 데이터 대응
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.notion.so/'
            }
        });
        return response;
    } catch (e) {
        console.error(`Error fetching ${targetUrl}:`, e.message);
        return null;
    }
}

app.get('/view/:b64Url', async (req, res) => {
    try {
        // 1. URL 디코딩
        const targetUrl = Buffer.from(req.params.b64Url, 'base64').toString('utf8');
        const origin = new URL(targetUrl).origin;

        const response = await proxyRequest(targetUrl);
        if (!response) return res.status(404).send('Target Not Found');

        const contentType = response.headers['content-type'];
        res.set('Content-Type', contentType);

        // 2. HTML인 경우에만 경로 치환 로직 실행
        if (contentType && contentType.includes('text/html')) {
            let html = response.data.toString('utf8');

            // [깨짐 방지 핵심] 모든 상대 경로를 프록시 주소로 변환
            // /_next/static/... -> /view/[Base64(https://www.notion.so/_next/static/...)]
            const replacePath = (match, p1, p2) => {
                const absoluteUrl = p2.startsWith('http') ? p2 : `${origin}${p2.startsWith('/') ? '' : '/'}${p2}`;
                const b64 = Buffer.from(absoluteUrl).toString('base64');
                return `${p1}="/view/${b64}"`;
            };

            html = html.replace(/(src|href)="([^"]*)"/g, replacePath);

            // 3. 인라인 스타일 및 스크립트 내의 notion.so 도메인 강제 치환
            html = html.replaceAll('https://www.notion.so', `${req.protocol}://${req.get('host')}/view/${Buffer.from('https://www.notion.so').toString('base64')}`);

            return res.send(html);
        }

        // 3. 이미지, CSS, JS 등은 그대로 반환
        res.send(response.data);

    } catch (error) {
        res.status(500).send('Proxy Error');
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    const startUrl = Buffer.from('https://www.notion.so').toString('base64');
    console.log(`Server started!`);
    console.log(`접속 주소: http://localhost:${PORT}/view/${startUrl}`);
});
