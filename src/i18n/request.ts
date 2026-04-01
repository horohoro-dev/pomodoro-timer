// サーバーサイドi18n設定: リクエストごとのロケールとメッセージ読み込み
import { getRequestConfig } from "next-intl/server";
import { defaultLocale } from "./config";

export default getRequestConfig(async () => {
  // TODO: Cookie/ヘッダーからロケールを取得するロジックを追加予定
  const locale = defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
