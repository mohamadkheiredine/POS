import { cookies } from "next/headers";
import FloorsLayout from "./floorsLayout";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value as "en" | "fr") || "en";

  return <FloorsLayout lang={lang}>{children}</FloorsLayout>;
}
