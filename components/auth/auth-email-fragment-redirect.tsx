"use client";

import { useEffect } from "react";
import { isPasswordSetupFragment } from "@/lib/auth-email-fragment";

/** Fallback for invitations sent manually from Supabase Dashboard. */
export function AuthEmailFragmentRedirect() {
  useEffect(() => {
    if (!isPasswordSetupFragment(window.location.hash)) return;

    // Keep the fragment client-side; it is consumed and removed on the target page.
    window.location.replace(`/nastav-heslo${window.location.hash}`);
  }, []);

  return null;
}

