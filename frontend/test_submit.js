const http = require('http');

const data = JSON.stringify({
  assignment_title: 'Test Essay',
  content: '<p>This is a test</p>',
  wpm: 50,
  paste_count: 0,
  replay_snapshots: [
    { timestamp: Date.now(), html: '<p>T</p>', textLength: 1 },
    { timestamp: Date.now()+1000, html: '<p>Te</p>', textLength: 2 }
  ]
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/submissions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Cookie': 'clio_session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InN0dWRlbnQxIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3MTI0OTc4ODUsImV4cCI6MTcxMjU4NDI4NX0.dummy;' // Fake token, won't work securely
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body+=chunk);
  res.on('end', () => console.log(res.statusCode, body));
});
req.write(data);
req.end();
