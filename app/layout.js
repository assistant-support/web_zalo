import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from 'sonner';

export const metadata = {
  title: "Zalo App",
  description: "Next.js 15 & Socket.IO",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body >
        <Providers>
          <main>{children}</main>
        </Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}