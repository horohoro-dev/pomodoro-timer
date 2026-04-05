// i18n設定: 対応ロケールとデフォルトロケール
export const locales = ["ja", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ja";
