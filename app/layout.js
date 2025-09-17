// app/layout.js
import "./globals.css";
import Providers from './providers'; // 1. Import component Providers

export const metadata = {
  title: "Web Zalo",
  description: "Real-time application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <Providers> {/* 2. Bọc children bằng Providers */}
          {children}
        </Providers>
      </body>
    </html>
  );
}