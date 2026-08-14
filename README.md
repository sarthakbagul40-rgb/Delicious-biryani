# Delicious Biryani 🍲 — Cloud Kitchen Live Ordering Portal

[![Live Web App](https://img.shields.io/badge/Live%20App-delicious--biryani--portal.vercel.app-orange?style=for-the-badge&logo=vercel)](https://delicious-biryani-portal.vercel.app)
[![Tech Stack](https://img.shields.io/badge/Stack-React%2019%20%7C%20Vite%20%7C%20Supabase%20%7C%20Tailwind-blue?style=for-the-badge)](https://delicious-biryani-portal.vercel.app)

> **Production Notice**: This is a live, production web application built for a real family-run cloud kitchen business (**Delicious Biryani**). It is actively used by real customers to browse authentic biryanis, thalis, and starters, customize portions, verify complex delivery serviceability, and place live orders.

---

## 🌐 Live Application

🔗 **Official Ordering Portal**: [https://delicious-biryani-portal.vercel.app](https://delicious-biryani-portal.vercel.app)

---

## ✨ Features

- 🍚 **Dynamic Menu Showcase**: Categorized browsing across Hyderabadi Dum Biryani, Authentic Thalis, Tandoori & Pan-Seared Starters, and Bhakri/Rice Add-ons.
- 🪄 **Mood Magic AI Finder**: Interactive craving assistant suggesting dishes based on flavor profiles (*Spicy & Bold*, *Rich & Creamy*, *Healthy & Light*, *Chef's Choice*).
- 📍 **Geocoded Serviceability Check**: Real-time location search powered by OpenStreetMap (Nominatim API) enforcing a strict 2.0 km delivery radius around kitchen service hubs.
- 🛍️ **Cart Persistence**: Persistent cart state managed via Zustand and `localStorage`.
- 💳 **Multi-Step Checkout Pipeline**:
  - Address selection & validation.
  - Contact confirmation.
  - Flexible payments via Instant UPI Deep Links (`upi://pay`) and Cash on Delivery (COD).
- 📲 **WhatsApp Instant Order Dispatch**: Automated order payload formatting dispatched straight to the cloud kitchen manager's WhatsApp business line.
- ⏱️ **Real-Time Order Tracking**: Live order status updates (`placed` -> `preparing` -> `out_for_delivery` -> `delivered`) powered by Supabase Realtime subscriptions.
- ⚡ **Optimized Performance**: Route-level code splitting using `React.lazy()` & custom Rollup vendor chunking (`< 6s` production build time).

---

## 🛠️ Tech Stack

* **Frontend Framework**: [React 19](https://react.dev/) + [Vite 5](https://vitejs.dev/)
* **State Management**: [Zustand](https://github.com/pmndrs/zustand)
* **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) + [Lucide Icons](https://lucide.dev/)
* **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Realtime API)
* **Geolocation & Maps**: [Leaflet](https://leafletjs.com/) + OpenStreetMap (Nominatim API)
* **Hosting & CDN**: [Vercel](https://vercel.com/)

---

## 🚀 Local Development Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* `npm` or `pnpm`

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sarthakbagul40-rgb/delicious-biryani.git
   cd delicious-biryani
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the template environment file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase project credentials and admin settings inside `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   VITE_ADMIN_WHATSAPP=91XXXXXXXXXX
   VITE_UPI_ID=your_upi_id@bank
   VITE_UPI_NAME=Delicious Biryani
   ```

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🔒 Security & Data Privacy

* **Zero Hardcoded Secrets**: All backend credentials, payment IDs, and WhatsApp endpoints are managed via environment variables.
* **Row Level Security (RLS)**: Supabase tables enforce strict user-level access policies.
* **Data Protection**: Customer data and order logs are sanitized and not stored in public source code.

---

## 📄 License & Attribution

Built with ❤️ for **Delicious Biryani Cloud Kitchen**. All rights reserved.
