import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export { tv, type VariantProps } from "tailwind-variants";

/**
 * クラス名を結合・マージするユーティリティ
 * clsx で条件付きクラスを処理し、tailwind-merge で競合を解決する
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
