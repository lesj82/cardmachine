'use client'

import Navbar from '@/components/Navbar'
import Features from '@/components/Features'
import Faqs from '@/components/Faqs'
import Footer from '@/components/Footer'
import Hero from '@/components/Hero'
import Booking from '@/components/Booking'

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans relative">
      <Navbar />
      <Hero />
      <Features />
      <Faqs />
      <Booking />
      <Footer />
    </main>
  )
}