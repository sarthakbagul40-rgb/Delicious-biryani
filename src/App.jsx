import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import useAuthStore from './store/useAuthStore'
import { supabase } from './lib/supabase'

// Lazy load page components for optimal bundle code-splitting
const Home = lazy(() => import('./pages/Home'))
const Details = lazy(() => import('./pages/Details'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Success = lazy(() => import('./pages/Success'))
const Auth = lazy(() => import('./pages/Auth'))
const Profile = lazy(() => import('./pages/Profile'))
const Orders = lazy(() => import('./pages/Orders'))
const Search = lazy(() => import('./pages/Search'))

// Page loading placeholder for smooth transitions
const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
    <div className="w-10 h-10 border-4 border-[#ec6d13] border-t-transparent rounded-full animate-spin"></div>
    <p className="text-sm font-medium text-slate-500">Loading Biryani Portal...</p>
  </div>
)

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) return null
  
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return children
}

function App() {
  const { setUser, checkSession } = useAuthStore()

  useEffect(() => {
    // Initial session check
    checkSession()

    // Listen for auth changes only if supabase is configured
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session)
      })
      return () => subscription.unsubscribe()
    }
  }, [])

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/details/:id" element={<Details />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/success" element={<Success />} />
          <Route path="/auth" element={<Auth />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App

