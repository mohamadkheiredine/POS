import { cookies } from "next/headers";
import MainLayout from "./mainLayout";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value as "en" | "fr") || "en";

  return <MainLayout lang={lang}>{children}</MainLayout>;
}
