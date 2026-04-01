import { Header } from "@/components/layout/header";

// アプリ内共通レイアウト（ヘッダー付き）
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
    </>
  );
}
