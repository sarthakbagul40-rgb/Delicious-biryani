import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Home, Briefcase, Plus, Loader2, Navigation, CheckCircle2, AlertCircle, Map as MapIcon, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import useAddressStore from '../store/useAddressStore';
import useAuthStore from '../store/useAuthStore';
import { 
  DELIVERY_ZONE_POLYGON, 
  isPointInServiceZone, 
  ZONE_CENTER, 
  SERVICEABLE_SECTORS 
} from '../lib/deliveryZone';

// Fix for default marker icons in Leaflet + Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper to update map center when coordinates change
const ChangeView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  return null;
};

// Map click handler
const MapClickHandler = ({ onLocationChange }) => {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const AddAddressModal = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { addAddress, isLoading } = useAddressStore();
  
  const [label, setLabel] = useState('Home');
  const [roomWing, setRoomWing] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [locality, setLocality] = useState('Crown Taloja');
  const [coords, setCoords] = useState({ lat: ZONE_CENTER.lat, lng: ZONE_CENTER.lng });
  const [step, setStep] = useState('form'); // 'form', 'map-confirm', 'verifying', 'success'
  const [result, setResult] = useState(null);

  const LOCALITIES = SERVICEABLE_SECTORS;

  const handleInitialVerify = async () => {
    const fullAddress = `${roomWing}, ${buildingName}, ${locality}`;
    if (!roomWing.trim() || !buildingName.trim()) {
      setResult({
        success: false,
        error: "Please enter your Flat/Room number and Building/Tower name."
      });
      return;
    }
    
    setStep('verifying');
    // We search first to get approximate coords
    const query = `${fullAddress}, Palava, Maharashtra`;
    const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    
    try {
      const geoRes = await fetch(geoUrl, {
        headers: { 'User-Agent': 'BiryaniApp/1.0 (contact@biryaniapp.local)' }
      });
      const geoData = await geoRes.json();
      
      if (geoData.length > 0) {
        setCoords({ lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) });
        setStep('map-confirm');
      } else {
        // Fallback to center of delivery zone if search fails, let user fix it on map
        setCoords({ lat: ZONE_CENTER.lat, lng: ZONE_CENTER.lng });
        setStep('map-confirm');
      }
    } catch (err) {
      setStep('form');
      setResult({ success: false, error: "Geocoding failed. Please try again." });
    }
  };

  const handleConfirmLocation = async () => {
    setStep('verifying');
    const fullAddress = `${roomWing}, ${buildingName}, ${locality}`;
    const userId = user?.uid || user?.id;
    const res = await addAddress(userId, {
      label,
      address_line: fullAddress,
      lat: coords.lat,
      lng: coords.lng
    });

    setResult(res);
    if (res.success) {
      setStep('success');
      setTimeout(() => {
        onClose();
        resetState();
      }, 2000);
    } else {
      setStep('form');
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setResult({ success: false, error: "Geolocation is not supported by your browser." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStep('map-confirm');
      },
      (err) => {
        console.warn('Geolocation error/denied:', err);
        setResult({ success: false, error: "Location permission denied. Please select your complex manually." });
      },
      { timeout: 8000 }
    );
  };

  const resetState = () => {
    setStep('form');
    setRoomWing('');
    setBuildingName('');
    setLocality('Crown Taloja');
    setCoords({ lat: ZONE_CENTER.lat, lng: ZONE_CENTER.lng });
    setResult(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl safe-bottom overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-center bg-white relative z-50">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {step === 'map-confirm' ? 'Confirm your Location' : 'Add New Address'}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Deliver to: <span className="text-primary font-black uppercase">{locality || '...'}</span>
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <AnimatePresence mode="wait">
            {step === 'form' && (
              <motion.div 
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 pt-2"
              >
                {/* Address Labels */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { id: 'Home', icon: Home },
                    { id: 'Work', icon: Briefcase },
                    { id: 'Other', icon: MapPin }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setLabel(item.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-twelve border-2 transition-all ${
                        label === item.id ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-slate-50 text-slate-400'
                      }`}
                    >
                      <item.icon size={24} strokeWidth={label === item.id ? 2.5 : 2} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{item.id}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-4 mb-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">Room No & Wing</label>
                      <input 
                        type="text"
                        value={roomWing}
                        onChange={(e) => setRoomWing(e.target.value)}
                        placeholder="e.g. 609/A"
                        className="w-full bg-slate-50 border border-slate-100 rounded-twelve p-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-primary transition-all placeholder:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">Building Name</label>
                      <input 
                        type="text"
                        value={buildingName}
                        onChange={(e) => setBuildingName(e.target.value)}
                        placeholder="e.g. Orchid"
                        className="w-full bg-slate-50 border border-slate-100 rounded-twelve p-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-primary transition-all placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">Locality (LODHA ZONE)</label>
                    <div className="relative">
                      <select 
                        value={locality}
                        onChange={(e) => setLocality(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-twelve p-4 text-sm font-black uppercase tracking-widest text-slate-800 focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                      >
                        {LOCALITIES.map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                      <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" />
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleDetectLocation}
                    className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest hover:underline px-1"
                  >
                    <Navigation size={14} /> Use Map Pin for Precision
                  </button>
                </div>

                {result && !result.success && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-twelve flex gap-3">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-xs font-bold leading-relaxed">{result.error}</p>
                  </div>
                )}

                <button 
                  onClick={handleInitialVerify}
                  disabled={isLoading}
                  className="w-full bg-primary text-white p-5 rounded-twelve font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-98"
                >
                  Next Step: Review Map <ChevronRight size={18} />
                </button>

              </motion.div>
            )}

            {step === 'map-confirm' && (() => {
              const isCurrentPointInside = isPointInServiceZone(coords.lat, coords.lng);
              return (
                <motion.div 
                  key="map"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col h-full min-h-[400px]"
                >
                  <div className="h-[300px] w-full relative">
                    <MapContainer center={[coords.lat, coords.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <ChangeView center={[coords.lat, coords.lng]} />
                      
                      {/* Exact Delivery Polygon Matching Google Maps Specification */}
                      <Polygon 
                        positions={DELIVERY_ZONE_POLYGON} 
                        pathOptions={{ 
                          color: '#ec6d13', 
                          weight: 3, 
                          fillColor: '#10b981', 
                          fillOpacity: 0.22, 
                          dashArray: '6, 6' 
                        }} 
                      />
                      
                      <Marker 
                        position={[coords.lat, coords.lng]} 
                        draggable={true} 
                        eventHandlers={{ 
                          dragend: (e) => setCoords({ lat: e.target.getLatLng().lat, lng: e.target.getLatLng().lng }) 
                        }} 
                      />
                      <MapClickHandler onLocationChange={(lat, lng) => setCoords({ lat, lng })} />
                    </MapContainer>

                    {/* Floating Real-Time Delivery Zone Indicator */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-sm pointer-events-none">
                      {isCurrentPointInside ? (
                        <div className="bg-emerald-600/95 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl shadow-xl border border-emerald-400/40 flex items-center justify-between text-xs font-bold transition-all">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={16} className="text-emerald-200" />
                            <span>Inside Delivery Zone!</span>
                          </span>
                          <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Serviceable</span>
                        </div>
                      ) : (
                        <div className="bg-rose-600/95 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl shadow-xl border border-rose-400/40 flex items-center justify-between text-xs font-bold transition-all animate-pulse">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle size={16} className="text-rose-200" />
                            <span>Outside Delivery Boundary</span>
                          </span>
                          <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Move Pin</span>
                        </div>
                      )}
                    </div>

                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-3.5 py-1.5 rounded-full shadow-md border border-slate-200 pointer-events-none">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                        <MapIcon size={12} className="text-[#ec6d13]" /> Drag pin to your exact building
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-6 sm:p-8">
                    {/* Status Info Box */}
                    <div className={`p-4 rounded-2xl border mb-6 flex gap-3.5 items-center transition-all ${
                      isCurrentPointInside 
                        ? 'bg-emerald-50/80 border-emerald-200/90 text-emerald-900' 
                        : 'bg-rose-50/80 border-rose-200/90 text-rose-900'
                    }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${
                        isCurrentPointInside ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}>
                        <MapPin size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider">
                            {isCurrentPointInside ? '✓ Inside Delivery Polygon' : '⚠️ Outside Delivery Boundary'}
                          </span>
                          <span className="text-[10px] font-mono font-bold opacity-75">
                            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold mt-0.5 leading-tight opacity-90">
                          {isCurrentPointInside 
                            ? 'Green zone confirmed. Hot dum biryani will be delivered fresh to this location!' 
                            : 'Please drag the pin inside the green shaded polygon to qualify for delivery.'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setStep('form')}
                        className="flex-1 py-3.5 px-6 rounded-2xl border-2 border-slate-100 text-slate-500 hover:text-slate-800 font-black uppercase tracking-widest text-xs transition-colors"
                      >
                        Back
                      </button>
                      <button 
                        onClick={handleConfirmLocation}
                        className={`flex-[2] py-3.5 px-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all flex items-center justify-center gap-2 ${
                          isCurrentPointInside 
                            ? 'bg-gradient-to-r from-[#ec6d13] to-[#f4c430] text-slate-950 shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] saffron-glow' 
                            : 'bg-slate-800 text-white hover:bg-slate-900'
                        }`}
                      >
                        <span>{isCurrentPointInside ? 'Confirm & Save Address' : 'Save Address (Outside Zone)'}</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {step === 'verifying' && (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center relative z-10 shadow-lg">
                    <Loader2 className="animate-spin text-white" size={32} />
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Finalizing Details</h3>
                <p className="text-slate-500 text-sm font-medium">Checking delivery radius for your location...</p>
              </div>
            )}

            {step === 'success' && (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-xl ${result?.isServiceable ? 'bg-emerald-500 shadow-emerald-200' : 'bg-orange-500 shadow-orange-200'}`}>
                  {result?.isServiceable ? <CheckCircle2 className="text-white" size={40} /> : <AlertCircle className="text-white" size={40} />}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  {result?.isServiceable ? 'Area Serviceable!' : 'Area Outside Radius'}
                </h3>
                <p className="text-slate-500 text-sm font-medium px-12">
                  {result?.isServiceable 
                    ? 'Perfect! Your address is set and verified.' 
                    : 'Location saved, but unfortunately we are not delivering here yet.'}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default AddAddressModal;
