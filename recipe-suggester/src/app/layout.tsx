import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zenny - AI Recipe Suggester",
  description: "Get personalized recipe suggestions based on ingredients you have",
  icons: {
    icon: [
      { url: '/logodog.jpg?v=3', type: 'image/jpeg', sizes: '32x32' },
      { url: '/logodog.jpg?v=3', type: 'image/jpeg', sizes: '16x16' }
    ],
    apple: [
      { url: '/logodog.jpg?v=3', sizes: '180x180', type: 'image/jpeg' }
    ],
    shortcut: '/logodog.jpg?v=3',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
