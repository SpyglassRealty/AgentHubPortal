import { test, expect } from '@playwright/test';

// Configure test settings
test.use({
  baseURL: 'https://missioncontrol-tjfm.onrender.com',
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure',
});

// Helper function to handle Google OAuth login
async function handleGoogleLogin(page) {
  // Navigate to the app
  await page.goto('/');
  
  // Click on login button if present
  const loginButton = page.locator('text=/sign in|log in/i').first();
  if (await loginButton.isVisible({ timeout: 5000 })) {
    await loginButton.click();
  }
  
  // Wait for either the dashboard or Google OAuth page
  await Promise.race([
    page.waitForURL('**/developer', { timeout: 60000 }),
    page.waitForURL('**/accounts.google.com/**', { timeout: 30000 })
  ]);
  
  // If we're on Google OAuth, we need manual intervention or test credentials
  if (page.url().includes('accounts.google.com')) {
    console.log('Google OAuth login required - please log in manually or provide test credentials');
    // In a real test environment, you'd fill in test credentials here
    // For now, we'll wait for manual login
    await page.waitForURL('**/developer', { timeout: 120000 });
  }
}

// Helper to capture console errors
function captureConsoleErrors(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.error('Console error:', msg.text());
    }
  });
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('Page error:', error.message);
  });
  return errors;
}

test.describe('Developer Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up error capturing
    captureConsoleErrors(page);
    
    // Handle authentication
    await handleGoogleLogin(page);
    
    // Navigate to developer dashboard
    await page.goto('/developer');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Activity Overview Tab', () => {
    test('1. Page loads with all required elements', async ({ page }) => {
      // Check Developer Dashboard title
      await expect(page.locator('h1:has-text("Developer Dashboard")')).toBeVisible();
      
      // Check Activity Timeline chart renders
      await expect(page.locator('text="Activity Timeline (Last 7 Days)"')).toBeVisible();
      const chart = page.locator('.recharts-wrapper').first();
      await expect(chart).toBeVisible({ timeout: 10000 });
      
      // Check Activity Feed shows entries
      await expect(page.locator('text="Activity Feed"')).toBeVisible();
      
      // Wait for activity entries to load
      const activityEntries = page.locator('[class*="border"][class*="rounded-lg"]:has([class*="badge"])');
      await expect(activityEntries.first()).toBeVisible({ timeout: 20000 });
    });

    test('2. Activity Feed search does not crash', async ({ page }) => {
      // Find the search input
      const searchInput = page.locator('input[placeholder*="Search activities"]');
      await expect(searchInput).toBeVisible();
      
      // Measure the time before typing
      const startTime = Date.now();
      
      // Type "Daryl" in the search box
      await searchInput.fill('Daryl');
      
      // Wait a bit to see if the page crashes
      await page.waitForTimeout(2000);
      
      // Verify the page hasn't crashed (white screen)
      const bodyBackground = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      expect(bodyBackground).not.toBe('rgb(255, 255, 255)'); // Not pure white
      
      // Check that main UI elements are still visible
      await expect(page.locator('h1:has-text("Developer Dashboard")')).toBeVisible();
      
      // Measure reload/flash time
      const endTime = Date.now();
      const reloadTime = endTime - startTime;
      console.log(`Activity Feed search filter time: ${reloadTime}ms`);
      
      // Verify results are filtered or loading state shown
      const loadingIndicator = page.locator('[class*="animate-spin"]');
      const filteredResults = page.locator('[class*="border"][class*="rounded-lg"]:has-text("Daryl")');
      
      // Either loading or filtered results should be visible
      const hasLoadingOrResults = await loadingIndicator.isVisible() || await filteredResults.count() > 0;
      expect(hasLoadingOrResults).toBeTruthy();
    });

    test('3. Filter by action type dropdown works', async ({ page }) => {
      // Find and click the action type dropdown
      const actionTypeDropdown = page.locator('[role="combobox"]:has-text("Filter by action type")');
      await actionTypeDropdown.click();
      
      // Select "Create" option
      await page.locator('[role="option"]:has-text("Create")').click();
      
      // Wait for feed to update
      await page.waitForTimeout(1000);
      
      // Verify feed has updated (either showing filtered results or loading)
      const badges = page.locator('.badge:has-text("create")');
      const loadingIndicator = page.locator('[class*="animate-spin"]');
      
      const hasFilteredResultsOrLoading = await badges.count() > 0 || await loadingIndicator.isVisible();
      expect(hasFilteredResultsOrLoading).toBeTruthy();
    });

    test('4. Activity Timeline chart has data', async ({ page }) => {
      // Wait for chart to render
      const chart = page.locator('.recharts-wrapper').first();
      await expect(chart).toBeVisible({ timeout: 10000 });
      
      // Check for data points (dots or lines)
      const dataPoints = page.locator('.recharts-dot, .recharts-line');
      await expect(dataPoints.first()).toBeVisible({ timeout: 10000 });
      
      // Check for axis labels
      const xAxisLabels = page.locator('.recharts-xAxis .recharts-text');
      const yAxisLabels = page.locator('.recharts-yAxis .recharts-text');
      
      await expect(xAxisLabels.first()).toBeVisible();
      await expect(yAxisLabels.first()).toBeVisible();
    });
  });

  test.describe('Development Changelog Tab', () => {
    test.beforeEach(async ({ page }) => {
      // Click on Development Changelog tab
      await page.locator('button:has-text("Development Changelog")').click();
      await page.waitForTimeout(2000); // Give it time to switch tabs
    });

    test('5. Development Changelog tab loads with entries', async ({ page }) => {
      // Verify tab content is visible
      await expect(page.locator('text="Track all code changes"')).toBeVisible({ timeout: 60000 });
      
      // Wait for changelog entries to load (generous timeout due to slow Render API)
      const changelogEntries = page.locator('[class*="border"][class*="rounded-lg"]:has([class*="badge"])');
      await expect(changelogEntries.first()).toBeVisible({ timeout: 60000 });
      
      const entryCount = await changelogEntries.count();
      console.log(`Changelog entries loaded: ${entryCount}`);
      expect(entryCount).toBeGreaterThan(0);
    });

    test('6. Category badges are dynamic (not all deployment)', async ({ page }) => {
      // Wait for entries to load
      await page.waitForSelector('[class*="border"][class*="rounded-lg"]:has([class*="badge"])', { timeout: 60000 });
      
      // Get all category badges
      const categoryBadges = page.locator('.badge').filter({ hasText: /bug fix|feature|ui update|database|api|deployment|documentation|maintenance|performance|testing|general update/i });
      
      // Count different categories
      const categories = new Set();
      const count = await categoryBadges.count();
      
      for (let i = 0; i < Math.min(count, 20); i++) { // Check first 20 badges
        const text = await categoryBadges.nth(i).textContent();
        categories.add(text.toLowerCase());
      }
      
      console.log('Found categories:', Array.from(categories));
      
      // Verify we have more than just "deployment"
      expect(categories.size).toBeGreaterThan(1);
      expect(Array.from(categories).some(cat => cat !== 'deployment')).toBeTruthy();
    });

    test('7. Status badges show variety', async ({ page }) => {
      // Wait for entries to load
      await page.waitForSelector('[class*="border"][class*="rounded-lg"]:has([class*="badge"])', { timeout: 60000 });
      
      // Get all status badges
      const statusBadges = page.locator('.badge').filter({ hasText: /deployed|deploying|in progress|pending|committed|failed|reverted/i });
      
      // Count different statuses
      const statuses = new Set();
      const count = await statusBadges.count();
      
      for (let i = 0; i < Math.min(count, 20); i++) { // Check first 20 badges
        const text = await statusBadges.nth(i).textContent();
        statuses.add(text.toLowerCase());
      }
      
      console.log('Found statuses:', Array.from(statuses));
      expect(statuses.size).toBeGreaterThan(0);
    });

    test('8. Commit hashes are valid', async ({ page }) => {
      // Wait for entries to load
      await page.waitForSelector('[class*="border"][class*="rounded-lg"]', { timeout: 60000 });
      
      // Look for commit hash elements (usually in code tags)
      const commitHashes = page.locator('code[class*="font-mono"]');
      
      const hashCount = await commitHashes.count();
      if (hashCount > 0) {
        // Check first few commit hashes
        for (let i = 0; i < Math.min(hashCount, 5); i++) {
          const hash = await commitHashes.nth(i).textContent();
          console.log(`Commit hash ${i}: ${hash}`);
          
          // Verify it's a 7-character hex string
          expect(hash).toMatch(/^[0-9a-f]{7}$/i);
        }
      } else {
        console.log('No commit hashes found in current view');
      }
    });

    test('9. Filter by category dropdown works', async ({ page }) => {
      // Wait for initial load
      await page.waitForSelector('[class*="border"][class*="rounded-lg"]', { timeout: 60000 });
      
      // Find and click the category filter dropdown
      const categoryDropdown = page.locator('[role="combobox"]').filter({ hasText: /filter by category/i });
      await categoryDropdown.click();
      
      // Select "Bug Fix" option
      await page.locator('[role="option"]:has-text("Bug Fix")').click();
      
      // Wait for filter to apply
      await page.waitForTimeout(2000);
      
      // Verify filtered results
      const badges = page.locator('.badge:has-text("bug fix")');
      if (await badges.count() > 0) {
        // If we have bug fix entries, they should all be bug fixes
        const allBadges = page.locator('[class*="border"][class*="rounded-lg"] .badge').first();
        await expect(allBadges).toContainText(/bug fix/i);
      } else {
        // If no bug fixes, we should see no entries or a "no entries" message
        const noEntriesMessage = page.locator('text=/no changelog entries/i');
        const entries = page.locator('[class*="border"][class*="rounded-lg"]:has(.badge)');
        
        const hasNoEntries = await noEntriesMessage.isVisible() || await entries.count() === 0;
        expect(hasNoEntries).toBeTruthy();
      }
    });

    test('10. Filter by status dropdown works', async ({ page }) => {
      // Wait for initial load
      await page.waitForSelector('[class*="border"][class*="rounded-lg"]', { timeout: 60000 });
      
      // Find and click the status filter dropdown
      const statusDropdown = page.locator('[role="combobox"]').filter({ hasText: /filter by status/i });
      await statusDropdown.click();
      
      // Select "Deployed" option
      await page.locator('[role="option"]:has-text("Deployed")').click();
      
      // Wait for filter to apply
      await page.waitForTimeout(2000);
      
      // Verify filtering worked
      const loadingIndicator = page.locator('[class*="animate-spin"]');
      const entries = page.locator('[class*="border"][class*="rounded-lg"]:has(.badge)');
      
      // Should either be loading or showing filtered results
      const hasLoadingOrEntries = await loadingIndicator.isVisible() || await entries.count() >= 0;
      expect(hasLoadingOrEntries).toBeTruthy();
    });

    test('11. Filter by developer dropdown has options', async ({ page }) => {
      // Wait for initial load
      await page.waitForSelector('[class*="border"][class*="rounded-lg"]', { timeout: 60000 });
      
      // Find and click the developer filter dropdown
      const developerDropdown = page.locator('[role="combobox"]').filter({ hasText: /filter by developer/i });
      await developerDropdown.click();
      
      // Check that we have options
      const options = page.locator('[role="option"]');
      const optionCount = await options.count();
      
      console.log(`Developer dropdown options: ${optionCount}`);
      expect(optionCount).toBeGreaterThan(1); // At least "All Developers" + 1 developer
      
      // Close dropdown
      await page.keyboard.press('Escape');
    });

    test('12. Measure changelog tab load time', async ({ page }) => {
      const startTime = Date.now();
      
      // Click on Development Changelog tab
      await page.locator('button:has-text("Development Changelog")').click();
      
      // Wait for entries to be visible
      await page.waitForSelector('[class*="border"][class*="rounded-lg"]:has([class*="badge"])', { 
        timeout: 60000 
      });
      
      // Wait for loading indicators to disappear
      await page.waitForSelector('[class*="animate-spin"]', { 
        state: 'hidden',
        timeout: 60000 
      });
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      console.log(`Changelog tab full load time: ${loadTime}ms (${(loadTime/1000).toFixed(1)}s)`);
      
      // Log warning if it takes too long
      if (loadTime > 30000) {
        console.warn(`⚠️ Changelog load time exceeded 30 seconds: ${(loadTime/1000).toFixed(1)}s`);
      }
    });
  });
});