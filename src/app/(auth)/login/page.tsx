import { cookies } from "next/headers";
import LoginClient from "./loginClient";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "en";

  return <LoginClient lang={lang as "en" | "fr"} />;
}
