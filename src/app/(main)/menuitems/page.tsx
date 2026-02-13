import { cookies } from "next/headers";
import SellingItemsClient from "@/components/include/SellingItemsClient";

export default async function MenuItemsPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "en";

  return <SellingItemsClient lang={lang as "en" | "fr"} />;
}
