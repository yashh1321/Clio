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
        
        # -> Click the 'Let's Go' button to open the editor so typing and integrity checks can begin.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[2]/div/main/div[2]/a/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the 'Let's Go' button (index 65) to open the editor and wait for the editor to load so typing and integrity checks can begin.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[2]/div/main/div[2]/a/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Fill the Student ID and Password fields with test credentials and click the Login button to enter the editor so typing and integrity checks can begin.
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
        elem = frame.locator('xpath=html/body/div[2]/div/main/form/div[3]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Start typing continuously in the editor (simulate by appending small chunks) so WPM calculation updates, then read the Typing Speed value and integrity chip state.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[2]/header/div[2]/button[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Append text into the contenteditable editor in short chunks to trigger the WPM analytics, wait for updates, extract current WPM and integrity chip data-integrity-state, pause, then resume fast typing and re-extract WPM and integrity state.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[2]/main/div/div[2]/div/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('The quick brown fox jumps over the lazy dog. ')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[2]/main/div/div[2]/div/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Typing speed test continuing to measure WPM. ')
        
        # -> Append rapid typing to the editor to raise WPM, wait for analytics to update, extract the current WPM and the integrity chip's data-integrity-state and visible label, pause typing, resume with fast typing, wait, then re-extract WPM and integrity state to verify updates.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[2]/main/div/div[2]/div/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.fill(' rapid rapid rapid rapid rapid rapid rapid rapid rapid rapid. ')
        
        # -> Append one more typing chunk into the contenteditable editor, wait for 2 seconds to allow analytics to update, then extract the displayed WPM numeric value, the integrity chip visible label text, and the integrity chip's data-integrity-state attribute.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[2]/main/div/div[2]/div/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.fill(' Adding one more rapid sentence to increase measured speed for WPM calculation. ')
        
        # -> 1) Extract current numeric WPM value, integrity chip visible label, and integrity chip data-integrity-state attribute. 2) Pause (wait) briefly. 3) Resume with fast typing (append to editor). 4) Wait and re-extract the three values to verify updates.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[2]/main/div/div[2]/div/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.fill(' FASTFAST FASTFAST FASTFAST FASTFAST FASTFAST.')
        
        # -> Click 'Exit Focus' (index 787) to reveal the full analytics UI, then extract the numeric WPM value, the integrity chip visible label text, and the integrity chip's data-integrity-state attribute (or 'not found' for any missing values). Return results as a JSON-like list [wpm, label, data-integrity-state].
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[2]/main/div/div[1]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        try:
            await expect(frame.locator('text=Integrity: Verified').first).to_be_visible(timeout=3000)
        except AssertionError:
            raise AssertionError("Test case failed: expected the editor to calculate typing speed and update the integrity status chip to 'Integrity: Verified' (green) after sustained/fast typing, but the expected integrity label did not appear — WPM analytics or integrity-status updates may be broken or too slow")
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    