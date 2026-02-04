import "./globals.css";
import ReduxProvider from "@/store/reduxProvider";

export const metadata = {
  title: "TitanPOS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
