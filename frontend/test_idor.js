const http = require('http');

async function testIDOR() {
    // 1. First, we need a student session token.
    // The login is handled at /api/auth/login.
    const loginData = JSON.stringify({
        username: 'student',
        password: '123'
    });

    const loginReq = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        timeout: 5000,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': loginData.length
        }
    }, (res) => {
        let cookies = res.headers['set-cookie'];
        let sessionCookie = cookies ? cookies.find(c => c.startsWith('clio_session=')) : null;

        if (!sessionCookie) {
            console.error("FAIL: Could not log in as student.");
            return;
        }

        // Consume the login response body so Node frees the socket gracefully
        res.on('data', () => { });
        res.on('end', () => {

            // 2. Now try to fetch grades with the student's token
            const gradeReq = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/api/grades?submission_id=1',
                method: 'GET',
                timeout: 5000,
                headers: {
                    'Cookie': sessionCookie
                }
            }, (resGrade) => {
                console.log(`GET /api/grades Status: ${resGrade.statusCode}`);
                let body = '';
                resGrade.on('data', chunk => body += chunk);
                resGrade.on('end', () => {
                    console.log(`Response Body: ${body}`);
                    if (resGrade.statusCode === 403) {
                        console.log("PASS: IDOR protected. Student received 403 Forbidden.");
                    } else {
                        console.log(`FAIL: Expected 403 Forbidden, got ${resGrade.statusCode}`);
                    }
                });
                gradeReq.on('error', e => {
                    console.error("Grade Req Error:", e);
                    process.exit(1);
                });
                gradeReq.on('timeout', () => {
                    console.error("FAIL: Grade request timed out");
                    gradeReq.destroy();
                    process.exit(1);
                });
                gradeReq.end();
            });
        });
    });

    loginReq.on('error', e => {
        console.error("Login Req Error:", e);
        process.exit(1);
    });
    loginReq.on('timeout', () => {
        console.error("FAIL: Login request timed out");
        loginReq.destroy();
        process.exit(1);
    });
    loginReq.write(loginData);
    loginReq.end();
}

testIDOR();
