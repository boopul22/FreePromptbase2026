/// <reference types="astro/client" />

type D1Database = import('@cloudflare/workers-types').D1Database;
type R2Bucket = import('@cloudflare/workers-types').R2Bucket;

declare namespace App {
  interface Locals {
    runtime: {
      env: {
        DB: D1Database;
        R2: R2Bucket;
        GOOGLE_CLIENT_ID: string;
        GOOGLE_CLIENT_SECRET: string;
        AUTH_SECRET: string;
        CLOUDFLARE_ACCOUNT_ID: string;
        R2_ACCESS_KEY_ID: string;
        R2_SECRET_ACCESS_KEY: string;
        R2_BUCKET_NAME: string;
        R2_ENDPOINT: string;
        R2_PUBLIC_URL: string;
        // Optional — only needed if using translate feature
        OPENROUTER_API_KEY?: string;
      };
      ctx: {
        waitUntil: (promise: Promise<unknown>) => void;
      };
    };
    user?: {
      id: string;
      googleId: string;
      name: string;
      email: string;
      avatarUrl: string;
      role: 'user' | 'admin';
    };
  }
}
