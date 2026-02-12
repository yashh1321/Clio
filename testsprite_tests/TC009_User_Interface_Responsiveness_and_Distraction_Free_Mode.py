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

        await context.set_viewport_size({"width": 1024, "height": 768})
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        await page.get_by_role("button", name="Let's Go").click()
        await page.get_by_role("button", name="Login").click()
        await page.wait_for_selector('[data-editor-root="true"]', timeout=10000)

        await page.get_by_role("button", name="Focus Mode").click()
        await page.wait_for_timeout(1000)

        if await page.locator('text=Session Analytics').count() != 0:
            raise AssertionError("Focus mode failed: Session Analytics panel is still visible.")
        if await page.locator('input[placeholder="Essay Title"]').count() != 0:
            raise AssertionError("Focus mode failed: header inputs are still visible.")
        if await page.locator('text=Exit Focus').count() == 0:
            raise AssertionError("Focus mode failed: Exit Focus control not visible.")

        await asyncio.sleep(2)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
