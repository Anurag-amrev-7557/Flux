/* eslint-disable @typescript-eslint/no-require-imports */
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        reactCompiler: false,
    },
    turbopack: {},
    output: 'export',
    images: {
        unoptimized: true,
    },
};

if (process.env.ENABLE_PWA === 'true') {
    try {
        const withSerwist = require("@serwist/next").default({
            swSrc: "src/app/sw.ts",
            swDest: "public/sw.js",
            disable: false,
        });
        module.exports = withSerwist(nextConfig);
    } catch {
        module.exports = nextConfig;
    }
} else {
    module.exports = nextConfig;
}
