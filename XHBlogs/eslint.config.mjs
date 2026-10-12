import js from "@eslint/js";
import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
export default tseslint.config(
 {ignores:[".next/**","node_modules/**","out/**","next-env.d.ts"]},
 js.configs.recommended,...tseslint.configs.recommended,
 {plugins:{"react-hooks":hooks},rules:{"react-hooks/rules-of-hooks":"error","react-hooks/exhaustive-deps":"warn","@typescript-eslint/no-unused-vars":"warn"}},
 {files:["app/tree/**/*.tsx","app/page.tsx","app/moments/**/*.tsx","app/music/**/*.tsx","app/posts/**/*.tsx","app/chatter/**/*.tsx","app/about/**/*.tsx","app/timeline/**/*.tsx","components/*.tsx"],rules:{"@typescript-eslint/no-explicit-any":"warn"}}
);
