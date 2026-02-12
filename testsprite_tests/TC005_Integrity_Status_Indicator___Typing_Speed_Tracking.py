import asyncio
from playwright import async_api

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

        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)

        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass

        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:3000
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        
        # -> Open the editor by clicking the 'Let's Go' button (element index 58).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[2]/div/main/div[2]/a/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Fill Student ID and Password fields with test credentials and click the Login button to reach the editor page.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[2]/div/main/form/div[1]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('example@gmail.com')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[2]/div/main/form/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('password123')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[2]/div/main/form/div[3]/a/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Type a short passage slowly into the editor to generate a low WPM reading, wait briefly, then extract the current Typing Speed (WPM) display and any nearby status label or color information.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div[2]/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('This is a slow typing test to verify the WPM indicator and color-coded feedback.')
        
        await page.evaluate("""() => {
            if (window.__setEditorContent) {
                window.__setEditorContent('Fast typing burst to trigger unusual speed indicator. ' + 'word '.repeat(300))
            }
        }""")
        
        frame = context.pages[-1]
        try:
            await async_api.expect(frame.locator('text=Unusual Speed').first).to_be_visible(timeout=3000)
        except AssertionError:
            raise AssertionError("Test case failed: Unusual Speed indicator did not appear after a rapid typing burst.")
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
