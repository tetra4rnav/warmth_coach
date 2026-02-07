import { cookies } from "next/headers";

export function getDevBypassEnabled() {
  return process.env.DEV_BYPASS_AUTH === "true";
}

export function getServerUserId() {
  const cookieStore = cookies();
  return cookieStore.get("wc_user_id")?.value || null;
}
