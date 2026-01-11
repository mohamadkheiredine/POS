import { cookies } from "next/headers";
import OrderClient from "@/components/include/OrderClient";

export default async function PosPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "en";

  return <OrderClient lang={lang as "en" | "fr"} />;
}
