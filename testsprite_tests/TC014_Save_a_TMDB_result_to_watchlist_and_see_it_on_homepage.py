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
        
        # -> Navigate to the registration page (/register)
        await page.goto("http://localhost:3000/register")
        
        # -> Fill the registration form with the test user's details and submit the form by clicking Sign Up.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/form/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('test_user_watchlist')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/form/div[2]/input').nth(0)
        await asyncio.sleep(3); await elem.fill('test_user_watchlist@example.com')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/form/div[3]/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('TestPassword123!')
        
        # -> Fill the Birth Date field with '2000-01-15' and submit the form by clicking Sign Up.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/form/div[4]/input').nth(0)
        await asyncio.sleep(3); await elem.fill('2000-01-15')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the Sign In page so I can log in with an existing account (use provided credentials) and continue with saving a TMDB item to the watchlist.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/p/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Fill the username and password fields and click Sign In to log in as Lucario.
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
        
        # -> Submit the Sign In form again by clicking the Sign In control and wait for the app to redirect to the logged-in homepage.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Dismiss the welcome tour modal, open a movie detail (Project Hail Mary) from Trending Films, then save it to the user's watchlist (next immediate action: click the modal 'LET'S GO! →' button to dismiss).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[8]/div/div[3]/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[5]/div[2]/div/div[2]/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the Project Hail Mary movie detail (click the movie card) so we can find and click the save/add-to-watchlist control.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[2]/div[2]/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click 'Add to Watchlist' on the Project Hail Mary detail, wait for the UI to update, then navigate back to the homepage to check the watchlist section for the saved item.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[2]/div[2]/div[2]/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Navigate to the homepage (/) and verify the watchlist section contains the saved item 'Project Hail Mary' (then stop).
        await page.goto("http://localhost:3000/")
        
        # -> Dismiss the welcome tour modal, reveal more of the homepage by scrolling, then search the page for 'Watchlist' (and related terms) to verify whether the saved item appears.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[8]/div/div[3]/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Dismiss the welcome tour modal by clicking the 'Next →' button so the homepage is fully visible, then search for the watchlist section and the saved item.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[9]/div/div[3]/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the app's watchlist view by clicking the bottom navigation 'watchlist/heart' control so we can verify the saved item appears there.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[6]/div/div/div/div[10]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the watchlist via the bottom navigation (heart) and verify the saved item appears by extracting any page lines containing 'Watchlist', 'Saved', or 'Project Hail Mary'.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[3]/div/main/div[6]/div/div/div/div[7]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        assert await frame.locator("xpath=//*[contains(., 'Project Hail Mary')]").nth(0).is_visible(), "The watchlist should display Project Hail Mary after saving it to the user's watchlist."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
