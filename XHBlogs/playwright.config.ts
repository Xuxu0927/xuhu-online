import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/e2e',workers:1,use:{baseURL:process.env.E2E_BASE_URL||'http://localhost:18081',headless:true},timeout:45000});
