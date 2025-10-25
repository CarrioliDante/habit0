"use client";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8 text-center">
      <h1 className="text-4xl font-bold">Habit0</h1>
      <p className="mt-2 opacity-80">Build gentle consistency.</p>

      <div className="mt-6">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="rounded-md border px-4 py-2">Iniciar sesión</button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <Link href="/dashboard" className="rounded-md border px-4 py-2">Ir al Dashboard</Link>
          <span className="inline-block ml-3 align-middle"><UserButton /></span>
        </SignedIn>
      </div>
    </main>
  );
}
