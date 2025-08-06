import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: `/nice-0816/`,
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: 'assets/*', // 原圖位置
            dest: 'assets', // 打包後放到 dist/assets/
          },
        ],
      }),
    ],
  };
});
