"use client";

import { useEffect, useState } from "react";
import SignOutButton from "./SignOutButton";
import RoleSwitch from "./RoleSwitch";

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export default function AuthSummary() {
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [role, setRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    const token = readCookie('auth_token');
    const r = readCookie('role');
    setHasToken(!!token);
    setRole(r || 'analyst');
  }, []);

  if (hasToken) {
    return (
      <div className="space-y-2 text-xs text-gray-500">
        <div>
          Role: <span className="font-medium capitalize">{role}</span>
        </div>
        <SignOutButton />
      </div>
    );
  }

  return <RoleSwitch />;
}
