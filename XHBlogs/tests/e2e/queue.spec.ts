import {test,expect} from '@playwright/test';
test('publication response preserves newly queued work',async({page})=>{
 await page.goto('/admin/login');await page.getByLabel('用户名').fill('test-admin');await page.getByLabel('密码').fill('local-e2e-password-123');await page.getByRole('button',{name:'登录',exact:true}).click();
 await page.getByRole('button',{name:'新建文章',exact:true}).click();
 await page.getByLabel('标题',{exact:true}).fill('First batch');await page.getByLabel('Markdown 正文').fill('first');await page.getByRole('button',{name:'加入发布队列'}).click();
 let release!:()=>void;
 const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/cms/operations',async route=>{const response=await route.fetch();await gate;await route.fulfill({response});});
 await page.getByRole('button',{name:/执行发布/}).click();
 await page.getByRole('button',{name:'新建文章',exact:true}).click();
 await page.getByLabel('标题',{exact:true}).fill('New pending work');await page.getByLabel('Markdown 正文').fill('second');await page.getByRole('button',{name:'加入发布队列'}).click();
 release();
 await expect(page.locator('aside')).toContainText('New pending work');
 await expect(page.locator('aside')).not.toContainText('First batch');
 await page.reload();
 await expect(page.locator('aside')).toContainText('New pending work');
});
