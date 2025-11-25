import type { Metadata } from "next";
import { Inter } from "next/font/google";
import StyledComponentsRegistry from "@/lib/registry";
import { Toaster } from "react-hot-toast";
import GlobalStyles from "../lib/GlobalStyles";
import { createGlobalStyle } from "styled-components";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agri-Track",
  description: "High-performance Logistics Tracking",
};

// We need to use a client component for GlobalStyle if we want to use createGlobalStyle
// But layout is a server component. 
// Solution: Create a GlobalStyles client component or put it in Registry.
// Let's put it in a separate Client Component or just inline it in Registry if possible?
// Better: Create `lib/GlobalStyles.tsx` client component.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ margin: 0, padding: 0, backgroundColor: "#0f172a", color: "#fff" }}>
        <StyledComponentsRegistry>
          <GlobalStyles />
          {children}
          <Toaster 
            position="top-center"
            toastOptions={{
              style: {
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#f8fafc',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#f8fafc',
                },
              },
            }}
          />
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
