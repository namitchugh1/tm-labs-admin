export const metadata = {
  title: "Diagnostics Collections Admin",
  description: "Create and update diagnostics collections in prod",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#f4f6f8",
          color: "#1a2230",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
