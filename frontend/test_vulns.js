const http = require('http');

async function testVulns() {
    const loginData = JSON.stringify({ username: 'student', password: '123' });

    console.log("1. Fetching session token...");
    const sessionCookie = await new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
        }, (res) => {
            let cookies = res.headers['set-cookie'];
            res.on('data', () => { }); // Consume
            resolve(cookies ? cookies.find(c => c.startsWith('clio_session=')) : null);
        });
        req.write(loginData);
        req.end();
    });

    if (!sessionCookie) { console.error("Login failed."); return; }
    console.log("Logged in.");

    // Helper
    const makeReq = (data, headers = {}) => {
        return new Promise((resolve) => {
            const payload = JSON.stringify(data);
            const req = http.request({
                hostname: 'localhost', port: 3000, path: '/api/submissions', method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie, 'Content-Length': Buffer.byteLength(payload), ...headers }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve({ status: res.statusCode, body }));
            });
            req.write(payload);
            req.end();
        });
    };

    console.log("\n--- Testing Vuln 1: DoS String Type Coercion ---");
    const res1 = await makeReq({ assignment_title: "Type Test", content: "test", wpm: "NOT_AN_INTEGER", paste_count: "NOT_AN_INTEGER" });
    console.log(`Status: ${res1.status}, Body: ${res1.body}`);

    console.log("\n--- Testing Vuln 2: XSS SVG Bypass ---");
    // We send payload to see what gets stored, then query to see how it comes back.
    const res2 = await makeReq({ assignment_title: "SVG Test", content: "<svg/onload=alert(1)>", wpm: 10, paste_count: 0 });
    console.log(`Status: ${res2.status}`);

    // Now fetch to check
    const fetchRes = await new Promise(resolve => {
        const r = http.request({
            hostname: 'localhost', port: 3000, path: '/api/submissions', method: 'GET',
            headers: { 'Cookie': sessionCookie }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        r.end();
    });
    // The student account can't call GET /api/submissions (Forbidden). Wait, let's login as teacher to check!

    // For now we just dump response

    console.log("\n--- Testing Vuln 3: Rate Limiting IP Spoofing ---");
    let successCount = 0;
    for (let i = 1; i <= 15; i++) {
        const res = await makeReq({ assignment_title: `RL Test ${i}`, content: "test", wpm: 10, paste_count: 0 }, { 'x-forwarded-for': `10.0.0.${i}` });
        if (res.status === 200) successCount++;
    }
    console.log(`Rate Limit Bypass: ${successCount}/15 requests succeeded. (Should be bounded to 10 if IP spoofing fails).`);
}

testVulns();
