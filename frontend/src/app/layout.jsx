export const metadata = {
  title: 'CineSense',
  description: 'Movie recommendation app',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}