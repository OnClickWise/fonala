import type { Metadata } from "next";
import { Dancing_Script, Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });
const script = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
  weight: "700",
});

export const metadata: Metadata = {
  title: "FONALA · Audiologia e Fonoterapia",
  description: "Cadastro de pacientes da clínica FONALA",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${nunito.variable} ${script.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
