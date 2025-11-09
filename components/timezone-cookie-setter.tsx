"use client";

import { setTimezoneCookie } from "@/actions/set-timezone-cookie";
import { useEffect } from "react";

export function TimezoneCookieSetter() {
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezoneCookie(timezone);
  }, []);

  return null;
}
