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
        
        # -> Type the username into the username field (index 615) and the password into the password field (index 627), then click 'Sign In' (index 641).
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/main/div[6]/form/div/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('Lucario')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/main/div[6]/form/div[2]/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill(os.environ.get('DEMO_PASSWORD', 'demo_pass'))
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/main/div[6]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the welcome modal 'Skip' button (element index 1276) to dismiss the modal so the LOGIN control is accessible.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/main/div[7]/div/div[3]/div/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the 'LOGIN' link in the header to reopen the login page so the second sign-in attempt can be made.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/main/nav/div/div/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Fill the username (index 1384) and password (index 1396) on the current login form, then click the Sign In button (index 1410) to perform the second login attempt.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/main/div[6]/form/div/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('Lucario')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/main/div[6]/form/div[2]/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill(os.environ.get('DEMO_PASSWORD', 'demo_pass'))
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/main/div[6]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        current_url = await frame.evaluate("() => window.location.href")
        assert '/room' in current_url
        assert await frame.locator("xpath=//*[contains(., 'Hello from UI test')]").nth(0).is_visible(), "Expected 'Hello from UI test' to be visible"
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    

