import { chromium } from "playwright";

const urls = [
"https://la.eater.com/2023/7/11/23791313/michelin-bib-gourmand-los-angeles-2023",
"https://la.eater.com/2024/8/5/24214294/michelin-bib-gourmand-2024-los-angeles",
"https://la.eater.com/restaurant-news/285741/michelin-bib-gourmand-2025-los-angeles",
"https://la.eater.com/2023/6/6/23750210/los-angeles-restaurants-james-beard-awards-winners-ceremony-chefs",
"https://www.jamesbeard.org/stories/the-2024-james-beard-award-winners",
"https://la.eater.com/2024/6/11/24175874/james-beard-foundation-awards-2024-winners-los-angeles",
"https://la.eater.com/2025/4/2/24399234/los-angeles-james-beard-foundation-award-nominees-2025",
"https://www.timeout.com/los-angeles/restaurants/best-restaurants-in-los-angeles"
];

(async () => {

const browser = await chromium.launch();
const page = await browser.newPage();

const results = [];

for (const url of urls) {

  await page.goto(url);

  const names = await page.$$eval(
    "h2, h3, strong, a",
    els => els.map(e => e.textContent?.trim()).filter(Boolean)
  );

  names.forEach(n => {
    if (n && n.length > 2 && n.length < 60) {
      results.push({
        name: n,
        source: url
      });
    }
  });
}

console.log(JSON.stringify(results, null, 2));

await browser.close();

})();