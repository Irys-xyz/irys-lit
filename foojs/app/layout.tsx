import type { Metadata } from "next";
import { Inter, Roboto } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/app/components/ClientProviders";
const inter = Inter({ subsets: ["latin"] });
const roboto = Roboto({
	weight: "400",
	subsets: ["latin"],
	display: "swap",
});

export const metadata: Metadata = {
  title: "Irys + Lit",
  description: "Secure and encrypted onchain data with Irys + LitProtocol",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en bg-primary h-full">
      <body className={roboto.className}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}