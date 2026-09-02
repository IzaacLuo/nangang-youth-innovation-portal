declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    R2?: R2Bucket;
  }
}
