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
        
        # -> Click the 'Let's Go' button to open the rich-text editor page.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[2]/div/main/div[2]/a/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)

        # -> Fill the login form with test credentials and click the Login button to access the editor.
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
        
        # -> Enter four distinct paragraphs into the editor (one paragraph per line) so each can be aligned individually.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div[2]/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Paragraph 1: This paragraph will be left aligned for testing.

Paragraph 2: This paragraph will be center aligned for testing.

Paragraph 3: This paragraph will be right aligned for testing.

Paragraph 4: This paragraph will be justified for testing.')
        
        frame = context.pages[-1]
        elem = frame.locator('[data-editor-root="true"] p').nth(0)
        await page.wait_for_timeout(1000); await elem.click(timeout=5000)
        elem = frame.locator('[data-testid="toolbar-align-left"]').first
        await page.wait_for_timeout(1000); await elem.click(timeout=5000)
        
        frame = context.pages[-1]
        elem = frame.locator('[data-editor-root="true"] p').nth(1)
        await page.wait_for_timeout(1000); await elem.click(timeout=5000)
        elem = frame.locator('[data-testid="toolbar-align-center"]').first
        await page.wait_for_timeout(1000); await elem.click(timeout=5000)
        
        frame = context.pages[-1]
        elem = frame.locator('[data-editor-root="true"] p').nth(2)
        await page.wait_for_timeout(1000); await elem.click(timeout=5000)
        elem = frame.locator('[data-testid="toolbar-align-right"]').first
        await page.wait_for_timeout(1000); await elem.click(timeout=5000)
        
        frame = context.pages[-1]
        elem = frame.locator('[data-editor-root="true"] p').nth(3)
        await page.wait_for_timeout(1000); await elem.click(timeout=5000)
        elem = frame.locator('[data-testid="toolbar-align-justify"]').first
        await page.wait_for_timeout(1000); await elem.click(timeout=5000)
        
        frame = context.pages[-1]
        await page.wait_for_timeout(1000)
        left_class = await frame.locator('[data-editor-root="true"] p').nth(0).get_attribute('class')
        center_class = await frame.locator('[data-editor-root="true"] p').nth(1).get_attribute('class')
        right_class = await frame.locator('[data-editor-root="true"] p').nth(2).get_attribute('class')
        justify_class = await frame.locator('[data-editor-root="true"] p').nth(3).get_attribute('class')
        if not left_class or 'text-align-left' not in left_class:
            raise AssertionError("Left alignment class not found on paragraph 1.")
        if not center_class or 'text-align-center' not in center_class:
            raise AssertionError("Center alignment class not found on paragraph 2.")
        if not right_class or 'text-align-right' not in right_class:
            raise AssertionError("Right alignment class not found on paragraph 3.")
        if not justify_class or 'text-align-justify' not in justify_class:
            raise AssertionError("Justify alignment class not found on paragraph 4.")
        
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
