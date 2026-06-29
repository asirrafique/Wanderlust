const http = require('http');
const querystring = require('querystring');
const postData = querystring.stringify({ username:'testuser'+Math.floor(Math.random()*100000), email:'test'+Math.floor(Math.random()*100000)+'@example.com', password:'testpass' });
const options = { hostname:'localhost', port:8080, path:'/signup', method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded', 'Content-Length':Buffer.byteLength(postData) } };
const req = http.request(options, res => {
  console.log('STATUS', res.statusCode);
  console.log('HEADERS', JSON.stringify(res.headers));
  res.setEncoding('utf8');
  res.on('data', chunk => process.stdout.write(chunk));
  res.on('end', () => process.exit(0));
});
req.on('error', e => { console.error('request error', e); process.exit(1); });
req.write(postData);
req.end();
