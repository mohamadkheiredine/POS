import { cookies } from "next/headers";
import KdsClient from "./KdsClient";

export default async function PosPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "en";

  return <KdsClient lang={lang as "en" | "fr"} />;
}
