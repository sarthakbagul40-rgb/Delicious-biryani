import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Dynamic SEO and OpenGraph Manager for Delicious Biryani
 * Injects structured schema and social preview meta tags on every route
 */
const SEOHead = () => {
  const location = useLocation();

  useEffect(() => {
    // Dynamic titles based on active route
    const routeTitles = {
      '/': 'Delicious Biryani | Authentic Dum Biryani Handis in Palava & Taloja',
      '/search': 'Search Menu | Delicious Biryani Fresh Dum Handis',
      '/orders': 'Live Kitchen Tracking | Delicious Biryani Orders',
      '/checkout': 'Secure Checkout Terminal | Delicious Biryani',
      '/success': 'Feast Confirmed! | Delicious Biryani Kitchen',
      '/profile': 'Member Portal & Privacy Rights | Delicious Biryani',
      '/auth': 'Sign In / Create Account | Delicious Biryani',
      '/privacy': 'Privacy Policy (DPDPA 2023) | Delicious Biryani',
      '/terms': 'Terms & Conditions | Delicious Biryani Kitchen Standards',
      '/cookies': 'Cookie & Storage Transparency Policy | Delicious Biryani'
    };

    const currentTitle = routeTitles[location.pathname] || 'Delicious Biryani | Authentic Dum Biryani Handis';
    document.title = currentTitle;

    // Helper to safely set or update meta tag
    const setMetaTag = (attributeName, attributeValue, content) => {
      let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Standard & OpenGraph tags
    setMetaTag('name', 'description', 'Order authentic slow-cooked dum biryani handis, thalis, and curries delivered piping hot in 20-35 mins across Lodha Palava Phase 2 and Crown Taloja. Zero gateway fee UPI.');
    setMetaTag('name', 'theme-color', '#ec6d13');
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:title', currentTitle);
    setMetaTag('property', 'og:description', 'Slow-cooked authentic dum handi biryanis delivered piping hot in 20-35 mins across Palava & Taloja. Order now with 0% gateway fee!');
    setMetaTag('property', 'og:site_name', 'Delicious Biryani');
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', currentTitle);
    setMetaTag('name', 'twitter:description', 'Authentic slow-dum handi biryani delivered to your society gate in Palava & Taloja.');

    // Inject or update Schema.org JSON-LD Structured Data
    const schemaId = 'delicious-biryani-jsonld';
    let script = document.getElementById(schemaId);
    if (!script) {
      script = document.createElement('script');
      script.id = schemaId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    const jsonLdPayload = {
      "@context": "https://schema.org",
      "@type": "FoodEstablishment",
      "name": "Delicious Biryani",
      "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=1200",
      "description": "Authentic clay handi slow dum cooked biryanis, thalis, and curries in Palava Phase 2 & Crown Taloja.",
      "servesCuisine": ["Indian", "Biryani", "Mughlai", "Hyderabadi", "Dum Cooking"],
      "telephone": "+91 9769793452",
      "priceRange": "₹₹",
      "paymentAccepted": "Cash, UPI, Google Pay, PhonePe, Paytm",
      "currenciesAccepted": "INR",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Palava Phase 2 & Crown Taloja Bypass",
        "addressLocality": "Dombivli / Taloja",
        "addressRegion": "Maharashtra",
        "postalCode": "421204",
        "addressCountry": "IN"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 19.1650,
        "longitude": 73.0850
      },
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          "opens": "11:00",
          "closes": "23:30"
        }
      ]
    };

    script.textContent = JSON.stringify(jsonLdPayload);
  }, [location.pathname]);

  return null;
};

export default SEOHead;
