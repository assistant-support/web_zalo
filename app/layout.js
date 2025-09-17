import "./globals.css";
import { SessionProvider } from "next-auth/react";
import SocketBridge from "@/components/realtime/SocketBridge";

export const metadata = {
  title: "My App",
  description: "Next 15 + NextAuth v5 + Socket.IO",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <SessionProvider>
          <SocketBridge />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
