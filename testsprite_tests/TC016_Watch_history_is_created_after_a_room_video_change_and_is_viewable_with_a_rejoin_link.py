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
        
        # -> Fill the registration form with username 'Lucario', email 'lucario@example.com', password os.environ.get('DEMO_PASSWORD', 'demo_pass'), birth date '2000-01-15' and submit the form.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div[5]/form/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('Lucario')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div[5]/form/div[2]/input').nth(0)
        await asyncio.sleep(3); await elem.fill('lucario@example.com')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div[5]/form/div[3]/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill(os.environ.get('DEMO_PASSWORD', 'demo_pass'))
        
        # -> Fill the birth date field with '2000-01-15' then submit the registration form by clicking 'Sign Up'.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div[5]/form/div[4]/input').nth(0)
        await asyncio.sleep(3); await elem.fill('2000-01-15')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div[5]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the 'Sign In' link to open the login form so I can log in as Lucario and continue to create a room.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div[5]/p/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Log in as user 'Lucario' by entering username and password and clicking the 'Sign In' button.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div[6]/form/div/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('Lucario')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div[6]/form/div[2]/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill(os.environ.get('DEMO_PASSWORD', 'demo_pass'))
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div[6]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Dismiss the onboarding modal so the page behind it is interactable, then create a room.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[8]/div/div[3]/div/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Create a room by clicking the CREATE ROOM control so the share modal appears (then dismiss it).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/div/div/div/div[3]/div[3]/div/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Fill the room name field and submit the Create Room form to create a room (then close the share modal after it appears).
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/div/div/div/div[3]/div[3]/form/div/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('LucarioHistoryRoom')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/div/div/div/div[3]/div[3]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        assert await frame.locator("xpath=//*[contains(., 'Rejoin')]").nth(0).is_visible(), "The watch history should show an entry with a Rejoin link after participating in the room"
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
