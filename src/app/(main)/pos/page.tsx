import { cookies } from "next/headers";
import POSClient from "@/components/include/POSClient";

export default async function PosPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "en";

  return <POSClient lang={lang as "en" | "fr"} />;
}
