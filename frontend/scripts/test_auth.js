const http = require('http');

// Read credentials from environment variables
const username = process.env.TEST_USERNAME;
const password = process.env.TEST_PASSWORD;

if (!username || !password) {
    console.error('Error: TEST_USERNAME and TEST_PASSWORD environment variables are required.');
    console.error('Usage: TEST_USERNAME=teacher TEST_PASSWORD=123 node scripts/test_auth.js');
    process.exit(1);
}

const postData = JSON.stringify({
    username: username,
    password: password
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log(`Login Status: ${res.statusCode}`);

    // Validate status code
    if (res.statusCode < 200 || res.statusCode >= 300) {
        console.error(`Login failed with status code: ${res.statusCode}`);
        res.resume(); // Consume response data to free up memory
        return;
    }

    const cookies = res.headers['set-cookie'];
    console.log('Set-Cookie Headers:', cookies);

    if (cookies && cookies.length > 0) {
        // Find the specific session cookie
        const sessionCookieRaw = cookies.find(c => c.trim().startsWith('clio_session='));

        if (sessionCookieRaw) {
            const sessionCookie = sessionCookieRaw.split(';')[0];
            console.log('Using Cookie:', sessionCookie);
            checkSession(sessionCookie);
        } else {
            console.error('Error: "clio_session" cookie not found in response.');
        }
    } else {
        console.error('No cookies received!');
    }
});

req.on('error', (e) => {
    console.error(`Login problem: ${e.message}`);
});

req.write(postData);
req.end();

function checkSession(cookie) {
    const sessionOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/session',
        method: 'GET',
        headers: {
            'Cookie': cookie
        }
    };

    const sessionReq = http.request(sessionOptions, (res) => {
        console.log(`Session Status: ${res.statusCode}`);
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log('Session Data:', data);
        });
    });

    sessionReq.on('error', (e) => {
        console.error(`Session problem: ${e.message}`);
    });

    sessionReq.end();
}
