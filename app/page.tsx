import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage(): Promise<never> {
  const session = await getSession();
  redirect(session.isLoggedIn ? "/pilotage" : "/login");
}
