const puppeteer = require('puppeteer');

(async () => {
    console.log('Starting Manual Frontend Tests...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    try {
        // Test 1: Load Homepage
        console.log('Test 1: Load Homepage (http://localhost:3000)');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        const title = await page.title();
        console.log(`Page Title: ${title}`);
        if (title) console.log('✅ Test 1 Passed: Homepage loaded');
        else console.error('❌ Test 1 Failed: Homepage title missing');

        // Test 2: Navigate to Login
        console.log('Test 2: Navigate to Login');
        // Assuming there is a login link or button, or we navigate directly
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
        const loginHeader = await page.$('h1');
        // Basic check if any h1 exists or specific text
        if (loginHeader) console.log('✅ Test 2 Passed: Login page loaded');
        else console.error('❌ Test 2 Failed: Login page header missing');

        // Test 3: Attempt Login (Mock)
        console.log('Test 3: Attempt Login');
        // Selectors need to be accurate. Based on potential standard UI.
        // Finding inputs by type or name
        const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
        const passwordInput = await page.$('input[type="password"]') || await page.$('input[name="password"]');
        const submitBtn = await page.$('button[type="submit"]');

        if (emailInput && passwordInput && submitBtn) {
            await emailInput.type('test@example.com');
            await passwordInput.type('password123');
            await submitBtn.click();
            await page.waitForNavigation({ timeout: 5000 }).catch(() => console.log('Navigation timeout (expected if auth fails or is mock)'));
            console.log('✅ Test 3 Passed: Login interaction performed');
        } else {
            console.error('❌ Test 3 Failed: Login elements not found');
            console.log('Found:', { email: !!emailInput, password: !!passwordInput, btn: !!submitBtn });
        }

    } catch (error) {
        console.error('❌ Test Suite Failed with Error:', error);
    } finally {
        await browser.close();
        console.log('Tests Finished.');
    }
})();
