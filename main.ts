const express = require('express');
const axios = require('axios');
const app = express();

app.get('/proxy', async (req, res) => {
    const encodedUrl = req.query.url;
    if (!encodedUrl) return res.send('URL이 없습니다.');

    // 1. Base64 디코딩
    const targetUrl = Buffer.from(encodedUrl, 'base64').toString('utf8');
    const originUrl = new URL(targetUrl);

    try {
        // 2. 실제 노션 페이지 데이터 가져오기 (User-Agent 설정으로 차단 방지)
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        let html = response.data;

        // 3. [핵심 로직] 모든 상대 경로를 노션 절대 경로로 치환 (화면 깨짐 방지)
        // src="/..." 또는 href="/..." 형태를 찾아 https://www.notion.so/... 로 변경합니다.
        html = html.replace(/(src|href)="\/([^"]*)"/g, `$1="${originUrl.origin}/$2"`);
        
        // 4. 인라인 스타일 내의 url(/...) 형태도 치환
        html = html.replace(/url\("\/(.*?)"\)/g, `url("${originUrl.origin}/$1")`);

        // 5. 결과 반환
        res.set('Content-Type', 'text/html');
        res.send(html);

    } catch (error) {
        res.status(500).send('에러 발생: ' + error.message);
    }
});

app.listen(3000, () => {
    console.log('브라우저에서 테스트: http://localhost:3000/proxy?url=' + Buffer.from('https://www.notion.so').toString('base64'));
});
