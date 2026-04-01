import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

// 環境変数からデータベースURLを取得
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Please set it in your environment variables.",
  );
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
