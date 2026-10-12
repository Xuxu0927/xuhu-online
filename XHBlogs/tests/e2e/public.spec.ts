import {test,expect} from '@playwright/test';
for(const route of ['/','/timeline','/chatter','/moments','/photowall','/projects','/friends','/music','/about','/tree']){
 test('public '+route,async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(route,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(3000);
  await expect(page.locator('body')).toBeVisible();
  expect(errors).toEqual([]);
 });
}
