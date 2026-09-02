import './globals.css';
import SwRegister from './sw-register';

export const metadata = {
  title: 'Controle Larissa',
  description: 'Controle financeiro pessoal - despesas, receitas e poupança',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Controle Larissa',
    statusBarStyle: 'black-translucent'
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#23211D'
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Source+Sans+3:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
