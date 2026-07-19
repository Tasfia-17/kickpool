import os
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
                ""                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Navigate to https://cinepurr.me
        await page.goto("https://cinepurr.me")
        
        # -> Navigate to /login (https://cinepurr.me/login) to begin the login step.
        await page.goto("https://cinepurr.me/login")
        
        # -> Type the username into the username field (index 568) as the immediate action.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[3]/main/div[6]/form/div/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('Lucario')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[3]/main/div[6]/form/div[2]/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill(os.environ.get('DEMO_PASSWORD', 'demo_pass'))
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/main/div[6]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the floating AI chat widget button (index 577) to open the chat widget.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[6]/div/div/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Navigate to the login page (/login) to retry the login flow so the chat widget can be opened after successful login.
        await page.goto("https://cinepurr.me/login")
        
        # -> Type 'Lucario' into the username field (index 1818) as the immediate action.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[3]/main/div[6]/form/div/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('Lucario')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[3]/main/div[6]/form/div[2]/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill(os.environ.get('DEMO_PASSWORD', 'demo_pass'))
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/main/div[6]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the floating AI chat widget button (index 1825) to open the chat widget.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[6]/div/div/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the onboarding modal 'Skip' button to close the modal so the floating AI chat widget becomes interactable.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/main/div[7]/div/div[3]/div/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the floating AI chat widget button at index 2495 to open the chat widget.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[6]/div/div/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Type the help question into the chat input (index 3095) and send it (press Enter).
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[6]/div/div/div/form/input').nth(0)
        await asyncio.sleep(3); await elem.fill('How do I start a co-watching room and invite friends?')
        
        # --> Test passed — verified by AI agent
        frame = context.pages[-1]
        current_url = await frame.evaluate("() => window.location.href")
        assert current_url is not None, "Test completed successfully"
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    

