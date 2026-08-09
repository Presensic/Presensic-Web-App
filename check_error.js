import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(500);
  
  const sizes = await page.evaluate(() => {
    let sizes = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      sizes[key] = localStorage.getItem(key).length;
    }
    return sizes;
  });
  console.log('LOCALSTORAGE_SIZES:', sizes);
  
  await browser.close();
})();
