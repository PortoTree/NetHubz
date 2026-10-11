import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

export const metadata: Metadata = {
  title: "NetHubz",
  description: "Platform untuk mencari semua kebutuhanmu",
  other: {
    google: "notranslate",
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

import SplashScreen from "@/components/SplashScreen";
import { UserProvider } from "@/contexts/UserContext";
import { MiniProfileProvider } from "@/contexts/MiniProfileContext";
import { ShareProvider } from "@/contexts/ShareContext";
import GlobalPostModal from "@/components/GlobalPostModal";
import ShareContainer from "@/components/share/ShareContainer";
import ClientNavbar from "@/components/ClientNavbar";
import BottomNav from "@/components/BottomNav";

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params; console.log('LOCALE IS', locale);

  // Validasi locale
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Load messages untuk locale ini
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <SplashScreen />
      <UserProvider>
        <MiniProfileProvider>
          <ShareProvider>
            <ClientNavbar />
            <div className="pb-14 md:pb-0">
              {children}
              <GlobalPostModal />
              <ShareContainer />
            </div>
            <BottomNav />
          </ShareProvider>
        </MiniProfileProvider>
      </UserProvider>
    </NextIntlClientProvider>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
