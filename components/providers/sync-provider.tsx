"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { processGroupsSyncQueue } from "@/lib/groupsSyncQueue";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      processGroupsSyncQueue();
    }
  }, [isLoaded, isSignedIn]);

  return <>{children}</>;
}
