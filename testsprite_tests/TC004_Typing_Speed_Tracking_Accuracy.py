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

        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        await page.get_by_role("button", name="Let's Go").click()
        await page.get_by_role("button", name="Login").click()
        await page.wait_for_selector('[data-editor-root="true"]', timeout=10000)

        editor = page.locator('[data-editor-root="true"]')
        await editor.click()
        await editor.type("The quick brown fox jumps over the lazy dog. " * 3, delay=25)
        await page.wait_for_timeout(1000)

        wpm_value = await page.locator('text=Typing Speed').locator('..').locator('span').first.text_content()
        if not wpm_value or not wpm_value.strip().isdigit():
            raise AssertionError(f"Typing speed not updated: expected numeric WPM, got {wpm_value}")
        if int(wpm_value.strip()) <= 0:
            raise AssertionError(f"Typing speed not updated: expected WPM > 0, got {wpm_value}")

        await asyncio.sleep(2)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
