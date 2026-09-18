import stylexPlugin from '@stylexjs/nextjs-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  webpack: (config) => {
    return config;
  }
};

export default stylexPlugin({
  rootDir: __dirname,
  aliases: {
    '@/*': [path.join(__dirname, 'src/*')],
  },
  useCSSLayers: true,
})(nextConfig);
