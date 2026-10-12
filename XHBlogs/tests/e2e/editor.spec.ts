import {test,expect} from '@playwright/test';
test('rich editor keeps externally uploaded images after typing',async({page})=>{
 await page.goto('/admin/login');
 await page.getByLabel('用户名').fill('test-admin');await page.getByLabel('密码').fill('local-e2e-password-123');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await page.getByRole('button',{name:'新建文章',exact:true}).click();
 await page.getByLabel('Markdown 正文').fill('# Rich text\n\n> Quote\n\n$x^2$');
 await page.getByRole('button',{name:'切换富文本'}).click();
 await page.locator('input[type=file]').setInputFiles({name:'tiny.gif',mimeType:'image/gif',buffer:Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64')});
 await expect(page.locator('.tiptap img[src^="/uploads/"]')).toHaveCount(1);
 await page.locator('.tiptap').click();await page.keyboard.press('Control+End');await page.keyboard.type('more text');
 await page.getByRole('button',{name:'切换 Markdown'}).click();
 await expect(page.getByLabel('Markdown 正文')).toContainText('/uploads/');
 await expect(page.getByLabel('Markdown 正文')).toContainText('x^2');
});
