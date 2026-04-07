import { redirect } from "next/navigation";

// トップページ → タイマーにリダイレクト
export default function Home() {
  redirect("/timer");
}
