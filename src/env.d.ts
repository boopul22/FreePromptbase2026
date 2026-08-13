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
        /** Bearer secret for /api/agent/cms/* machine publishing routes. */
        AGENT_PUBLISH_TOKEN: string;
        /** Active admin user credited for agent API writes. */
        AGENT_PUBLISH_USER_ID: string;
        CLOUDFLARE_ACCOUNT_ID: string;
        R2_ACCESS_KEY_ID: string;
        R2_SECRET_ACCESS_KEY: string;
        R2_BUCKET_NAME: string;
        R2_ENDPOINT: string;
        R2_PUBLIC_URL: string;
        // Cloudflare Email Sending — newsletter double opt-in (src/lib/subscribers.ts).
        EMAIL: {
          send(message: {
            to: string | string[];
            from: { email: string; name?: string };
            replyTo?: string;
            subject: string;
            html: string;
            text: string;
            headers?: Record<string, string>;
          }): Promise<{ messageId?: string }>;
        };
        EMAIL_FROM: string;
        EMAIL_FROM_NAME: string;
        EMAIL_REPLY_TO: string;
        SITE_URL: string;
        IG_ACCESS_TOKEN: string;
        IG_USER_ID: string;
        FB_PAGE_ACCESS_TOKEN: string;
        FB_PAGE_ID: string;
        META_API_VERSION: string;
        IG_API_HOST: string;
        FB_API_HOST: string;
        // Optional — only needed if using translate feature
        OPENROUTER_API_KEY?: string;
      };
      ctx: {
        waitUntil: (promise: Promise<unknown>) => void;
      };
    };
    /** Workers execution context (Astro v6 cloudflare adapter). */
    cfContext: {
      waitUntil: (promise: Promise<unknown>) => void;
    };
    user?: {
      id: string;
      googleId: string;
      name: string;
      email: string;
      avatarUrl: string;
      role: 'user' | 'admin';
    };
    /** "user:<id>" when signed in, "anon:<uuid>" otherwise. Set by middleware. */
    actorId?: string;
    /** Slugs the current actor has saved (bookmarked) — seeds bookmark state on cards. */
    savedSlugs?: Set<string>;
    /** Slugs the current actor has liked — seeds heart state on cards. */
    likedSlugs?: Set<string>;
  }
}
