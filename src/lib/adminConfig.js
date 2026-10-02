/**
 * Admin Access & Configuration for Delicious Biryani Kitchen Owner
 */

export const DEFAULT_ADMIN_EMAIL = 'sarthakbagul40@gmail.com';

// Whitelisted Admin emails - also reads from Vite environment variable
export const ADMIN_EMAILS = [
  DEFAULT_ADMIN_EMAIL.toLowerCase(),
  'sarthakbagul40@gmailcom', // handle typo without dot
  'sarthakbagul@gmail.com',
  'admin@deliciousbiryani.com',
  (import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase().trim(),
  'deliciousbiryaniofficial@gmail.com',
  'owner@deliciousbiryani.com'
].filter(Boolean);

/**
 * Checks if a given email is a designated restaurant admin
 */
export const isAdminEmail = (email) => {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(clean);
};

/**
 * Checks if a user object or user profile possesses admin privileges
 */
export const isAdminUser = (user, userProfile) => {
  if (!user && !userProfile) return false;
  
  const userEmail = (user?.email || '').toLowerCase().trim();
  const profileEmail = (userProfile?.email || '').toLowerCase().trim();
  
  if (userEmail && isAdminEmail(userEmail)) return true;
  if (profileEmail && isAdminEmail(profileEmail)) return true;
  
  if (userProfile?.role === 'admin' || user?.role === 'admin') return true;
  if (user?.isDemoAdmin || userProfile?.isDemoAdmin) return true;
  
  return false;
};
