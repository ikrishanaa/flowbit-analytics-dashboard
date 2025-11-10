import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const c = await (cookies() as any);
  const token = (c?.get?.("auth_token")?.value ?? c?.get?.("auth_token")?.value) as string | undefined;
  const hasToken = Boolean(token);
  redirect(hasToken ? "/dashboard" : "/login");
}
