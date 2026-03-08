import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:3000
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        
        # -> Click the 'Let's Go' button (index 65) to open the next page (expected: login/register).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div[2]/a/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Navigate to /register (explicit navigate to http://localhost:3000/register) to open the registration form so the registration fields can be filled.
        await page.goto("http://localhost:3000/register", wait_until="commit", timeout=10000)
        
        # -> Select role 'Student' and fill the registration form with the provided test data, then click the Create Account button.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/div/div/form/div/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/div/div/form/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('student_user_dup')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/div/div/form/div[3]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Duplicate Email')
        
        # -> Fill the email field with 'existing_user@example.com', fill Password and Confirm Password with 'ValidPass!12345', then click the 'Create Account' button to submit the form.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/div/div/form/div[4]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('existing_user@example.com')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/div/div/form/div[6]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('ValidPass!12345')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/div/div/form/div[7]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('ValidPass!12345')
        
        # -> Click the 'Create Account' button (index 377) to submit the form so the app can be observed for the 'Email already in use' error and to verify the URL remains on /register.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/div/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Email already in use').first).to_be_visible(timeout=3000)
        assert '/register' in frame.url
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    