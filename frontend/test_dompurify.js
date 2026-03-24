const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = require('dompurify')(window);
console.log('Result for <p></p>:', JSON.stringify(DOMPurify.sanitize('<p></p>')));
console.log('Result for empty string:', JSON.stringify(DOMPurify.sanitize('')));
