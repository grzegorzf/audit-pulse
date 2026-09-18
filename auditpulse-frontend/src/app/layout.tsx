import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AuditPulse // High-Throughput Market Ingestion & DLQ Inspector',
  description: 'High-throughput Coinbase trade ingestion engine with DDD sequence validation and real-time DLQ inspector',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
