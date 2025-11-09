"use server";

import { cookies } from "next/headers";

export async function setTimezoneCookie(timezone: string) {
  if (typeof timezone !== "string" || !timezone.includes("/")) return;

  const cookieStore = await cookies();

  cookieStore.set({
    name: "user_timezone",
    value: timezone,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}
