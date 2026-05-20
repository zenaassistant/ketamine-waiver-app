import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Conscious Health — Treatment Compliance Agreements',
  description: 'Ketamine Treatment Compliance Agreements',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
