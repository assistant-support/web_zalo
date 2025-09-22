import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from 'sonner';
import ShellGate from "@/components/shell/wrap";  
import { auth } from "@/auth";

export const metadata = {
  title: "Zalo App",
  description: "Next.js 15 & Socket.IO",
};

export default async function RootLayout({ children }) {
  const session = await auth();

  return (
    <html lang="en">
      <body >
        <Providers>
          <main>
            <ShellGate session={session}>{children}</ShellGate></main>
        </Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}