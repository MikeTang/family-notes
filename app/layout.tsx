import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Notes",
  description: "Your family's shared notepad.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-screen antialiased"
        style={{ backgroundColor: "#fdf8f0", fontFamily: "'Inter', sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
