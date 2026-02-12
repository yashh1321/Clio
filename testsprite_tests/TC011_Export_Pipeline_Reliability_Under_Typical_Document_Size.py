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
        
        # -> Enter the application by clicking the 'Let's Go' button to access document creation UI.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[2]/div/main/div[2]/a/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Enter the application / open the document creation/editor UI by clicking the 'Let's Go' button (index 65).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[2]/div/main/div[2]/a/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Submit the login form by clicking the 'Login' button to enter the application and access the document creation/editor UI.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[2]/div/main/form/div[3]/a/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Submit the login form by clicking the 'Login' button (index 410) again to enter the application and access the document creation/editor UI.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[2]/div/main/form/div[3]/a/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Insert a mixed-content academic essay into the contenteditable editor (index 806), then trigger DOCX export (index 697), wait to observe completion, then trigger PDF export (index 698) and wait to observe completion.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div[2]/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Philosophy 101 — Mid-Term Essay

Introduction

This essay examines the interplay between epistemic justification and practical reasoning in human decision-making. It argues that knowledge claims do not stand in isolation from the decisions they inform; rather, justification and practical considerations co-constitute rational action. The discussion proceeds in three parts: (1) an outline of central epistemic concepts, (2) analysis of how practical reasons affect justification, and (3) implications for pedagogy and assessment.

Epistemic Background

Epistemology traditionally analyzes the conditions under which beliefs are justified or count as knowledge. Classic accounts emphasize truth, belief, and justification. Reliabilist and evidentialist approaches offer contrasting mechanisms: reliabilism appeals to the reliability of belief-producing processes, while evidentialism focuses on the supporting evidence available to an agent. Both accounts aim to explain why some beliefs are rational and others are not.

Practical Reason and Justification

A growing literature suggests that practical factors influence epistemic justification. Consider cases where stakes are high: agents require stronger evidence to form action-guiding beliefs when errors are costly. This observation motivates pragmatic encroachment theories, which claim that practical stakes can alter the threshold for knowledge. The key claim is not that truth or evidence changes, but that the normative standard for forming certain beliefs shifts in light of the consequences of acting on those beliefs.

Mixed-Method Example

- Scenario: A student must decide whether to submit an answer that is 70% certain. If the cost of error is minor (e.g., minimal grade impact), the student may reasonably proceed. If the cost is high (e.g., failing the course), the threshold for justified belief should be higher.

- Analysis: This demonstrates how practical concerns shape justified belief. An evidentialist can accommodate this by allowing evidential requirements to depend on context. Alternatively, a reliabilist might argue that the reliability of cognitive processes is effectively lowered under stress, altering justification.

Argument and Defense

The position defended here accepts a contextualist reading: epistemic standards vary with practical context. The defense rests on three points:
1) Intuitiveness: ordinary agents already shift their confidence based on stakes. 
2) Normative coherence: integrating practical reasons prevents systematic irrational actions. 
3) Pedagogical utility: teaching students to reflect on stakes improves decision quality.

Implications

If epistemic standards are context-sensitive, assessment practices must account for the environments in which students reason. High-stakes testing should include scaffolding that reduces extraneous pressure, while formative assessments can mimic low-stakes environments that encourage exploratory reasoning.

Conclusion

The interplay between practical and epistemic reasons is central to understanding rational action. Context-sensitive standards better reflect how agents actually form beliefs and how they should when decisions matter. Future work should explore empirical studies that measure shifts in confidence and decision thresholds under varied stakes.

References (select)

- Title A. Author. (Year). On Pragmatic Encroachment. Journal of Philosophy.
- Title B. Author. (Year). Evidentialism Revisited. Epistemic Studies.

[End of document sample — contains headings, paragraphs, a short bullet list, and references.]

')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[2]/header/div[2]/div[1]/button[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Insert the academic essay into the contenteditable editor (index 806), then trigger the .docx export (index 697) and measure by waiting up to 5s, then trigger the .pdf export (index 698) and wait up to 5s to observe completion.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div[2]/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Philosophy 101 — Mid-Term Essay

Introduction

This essay examines the interplay between epistemic justification and practical reasoning in human decision-making. It argues that knowledge claims do not stand in isolation from the decisions they inform; rather, justification and practical considerations co-constitute rational action. The discussion proceeds in three parts: first, an overview of standard accounts of epistemic justification; second, an analysis of how practical stakes and aims shape epistemic norms; and third, a consideration of implications for educational and policy contexts.

Epistemic Justification: Traditional Views

Traditionally, epistemic justification is characterized by evidential support, reliability, and coherence. Foundationalists emphasize basic beliefs grounded in non-inferential justification, while coherentists stress mutual support among beliefs. Externalist approaches focus on reliability of belief-forming processes. Each of these frameworks offers insight into when belief is warranted, but by themselves they underplay the role of the agent\'s goals and the consequences of action.

Practical Reasoning and Epistemic Norms

Practical reasoning involves evaluating options in light of goals, risks, and values. When epistemic decisions have practical consequences, standards for belief and inquiry may justifiably shift. High-stakes contexts demand stronger evidence and caution; low-stakes situations allow for more permissive standards. This conditional sensitivity does not collapse epistemic reasons into merely pragmatic considerations. Instead, practical factors modulate the threshold at which epistemic norms are satisfied.

Implications and Conclusion

Acknowledging the interplay between justification and practical reasoning promotes a more nuanced epistemology that better reflects real-world deliberation. Educational practices, for instance, should teach students not only methods of justification but also how to weigh epistemic and practical considerations contextually. Policy-making likewise benefits from explicit integration of epistemic standards with practical stakes. Ultimately, a productive synthesis recognizes that epistemic norms are robust yet responsive to the practical environments in which agents operate.')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[2]/header/div[2]/div[1]/button[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        try:
            await expect(frame.locator('text=PDF ready for download').first).to_be_visible(timeout=3000)
        except AssertionError:
            raise AssertionError("Test case failed: expected the PDF export to complete and show 'PDF ready for download' within 5 seconds, but the success indicator did not appear — the PDF export pipeline may have stalled, failed, or exceeded the time limit.")
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    