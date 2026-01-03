import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@guardrail-sim/policy-engine', '@guardrail-sim/mcp-server'],
};

export default withMDX(nextConfig);
