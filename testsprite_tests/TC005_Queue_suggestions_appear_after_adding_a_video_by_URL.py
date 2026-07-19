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
        
        # -> Navigate to the registration page and start the account creation flow (fill username, email, password, birthDate, then submit).
        await page.goto("http://localhost:3000/register")
        
        # -> Fill the registration form with the provided credentials (username Lucario, email lucario@example.com, password ***REMOVED***, birth date 2000-01-15) and submit the form.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/form/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('Lucario')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/form/div[2]/input').nth(0)
        await asyncio.sleep(3); await elem.fill('lucario@example.com')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/form/div[3]/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill(os.environ.get('DEMO_PASSWORD', 'demo_pass'))
        
        # -> Fill the birthdate field with '2000-01-15' and click 'Sign Up' to submit the registration form.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/form/div[4]/input').nth(0)
        await asyncio.sleep(3); await elem.fill('2000-01-15')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Navigate to the homepage (http://localhost:3000/) so I can click a public room from the room list.
        await page.goto("http://localhost:3000/")
        
        # -> Click the public room 'Resque's Room' join link to enter the room and look for the add-by-link / URL input to queue a video.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/div/div[2]/div/div/div[2]/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Fill the login form with username 'Lucario' and password os.environ.get('DEMO_PASSWORD', 'demo_pass'), then click 'Sign In' to log in.
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
        
        # -> Wait for the login action to complete, then navigate to the homepage (/) to reach the room list or user dashboard so we can create or join a room.
        await page.goto("http://localhost:3000/")
        
        # -> Click the public room 'Resque's Room' join link so we can access the room and add a video URL to the queue.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/div/div[2]/div/div/div[2]/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Paste a valid YouTube URL into the room's YouTube search/paste input and submit (click 'Go') so the app can resolve the link and allow adding it to the queue.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[3]/div/main[2]/div/div/div[2]/div[2]/form/input').nth(0)
        await asyncio.sleep(3); await elem.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main[2]/div/div/div[2]/div[2]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        assert await frame.locator("xpath=//*[contains(., 'Rick Astley - Never Gonna Give You Up (Official Music Video)')]").nth(0).is_visible(), "The queue should show Rick Astley - Never Gonna Give You Up (Official Music Video) after adding the YouTube link."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
