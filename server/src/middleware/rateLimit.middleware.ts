import type { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  message?: string;
};

type Bucket = { count: number; resetAt: number };

/**
 * Process-local safety brake for small deployments. For multi-instance or
 * autoscaled production deployments, replace with a shared Redis/database store.
 */
export function createRateLimiter({ windowMs, max, message = "Too many requests. Please try again later." }: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    if (bucket.count >= max) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      res.setHeader("RateLimit-Limit", String(max));
      res.setHeader("RateLimit-Remaining", "0");
      return res.status(429).json({ success: false, message });
    }
    bucket.count += 1;
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    if (buckets.size > 5000) {
      for (const [entryKey, entry] of buckets) {
        if (entry.resetAt <= now) buckets.delete(entryKey);
      }
    }
    return next();
  };
}
