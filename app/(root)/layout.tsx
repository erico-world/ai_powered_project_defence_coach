import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { isAuthenticated } from "@/lib/actions/auth.action";

const Layout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();
  if (!isUserAuthenticated) redirect("/sign-in");

  return (
    <div className="root-layout">
      <nav>
        <Link href="/" className="flex items-center gap-1">
          <Image src="/logo.svg" width={34} height={34} alt="logo" />
          <h2 className="text-primary-100">AI-POWERED-PROJECT DEFENSE-COACH</h2>
        </Link>
      </nav>

      {children}
    </div>
  );
};

export default Layout;
