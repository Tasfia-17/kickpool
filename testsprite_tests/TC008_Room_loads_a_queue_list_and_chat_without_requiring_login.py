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
        # -> Navigate to http://localhost:3000
        await page.goto("http://localhost:3000")
        
        # -> Click a public room's 'Watch Together' button from the movie grid to open the room view, then wait for the room layout to render so we can verify the queue and chat areas.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div[2]/div[2]/button/div/div[2]/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Navigate to the site root (http://localhost:3000/) so the public room list is visible, then click a public room's 'Watch Together' (or room card) to open the room view and verify queue and chat areas.
        await page.goto("http://localhost:3000/")
        
        # -> Dismiss the welcome modal by clicking 'Skip', then click the Avatar movie card (index 1758) to open the room view and wait for the room layout to render so we can verify the queue and chat areas.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[7]/div/div[3]/div/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/div[2]/div/div[2]/a[7]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the 'Watch Together' button for the Avatar: Fire and Ash card (index 2202) and wait for the room layout to render, then inspect the page for queue and chat areas.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[2]/div[2]/button[7]/div/div[2]/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Fill the Sign In form and submit credentials to log in as the test user (username: Lucario).
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[6]/form/div/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('Lucario')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[6]/form/div[2]/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill(os.environ.get('DEMO_PASSWORD', 'demo_pass'))
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[6]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        assert await frame.locator("xpath=//*[contains(., 'Queue')]").nth(0).is_visible(), "The room should display the queue list area so guests can see and manage the video queue.",
        assert await frame.locator("xpath=//*[contains(., 'Chat')]").nth(0).is_visible(), "The room should display the chat area so guests can view and participate in conversations.",
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
