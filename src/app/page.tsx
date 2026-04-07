import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

// トップページ → タイマーにリダイレクト
export default function Home() {
  redirect(ROUTES.TIMER);
}
