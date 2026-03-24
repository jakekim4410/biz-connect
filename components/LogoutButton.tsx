"use client";
import { signOut } from "next-auth/react";
export default function LogoutButton() {
  return <button onClick={() => signOut()} className="text-slate-400 hover:text-rose-500 font-bold transition-colors">로그아웃</button>;
}