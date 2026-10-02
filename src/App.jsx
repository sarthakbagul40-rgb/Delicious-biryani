import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import useAuthStore from './store/useAuthStore'
import SEOHead from './components/SEOHead'

import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import AdminProtectedRoute from './components/AdminProtectedRoute'

const Home = lazy(() => import('./pages/Home'))
const Details = lazy(() => import('./pages/Details'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Success = lazy(() => import('./pages/Success'))
const Auth = lazy(() => import('./pages/Auth'))
const Profile = lazy(() => import('./pages/Profile'))
const Orders = lazy(() => import('./pages/Orders'))
const Search = lazy(() => import('./pages/Search'))
const Admin = lazy(() => import('./pages/Admin'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsConditions = lazy(() => import('./pages/TermsConditions'))
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'))
const NotFound = lazy(() => import('./pages/NotFound'))

const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
    <div className="w-10 h-10 border-4 border-[#ec6d13] border-t-transparent rounded-full animate-spin" />
    <p className="text-sm font-medium text-slate-500">Loading Biryani Portal...</p>
  </div>
)

function App() {
  const { initAuth } = useAuthStore()

  useEffect(() => {
    const unsubscribe = initAuth()
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [initAuth])

  return (
    <ErrorBoundary>
      <SEOHead />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/details/:id" element={<Details />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/success" element={<Success />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsConditions />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/admin" element={<AdminProtectedRoute><Admin /></AdminProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}


export default App
