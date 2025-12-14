import React, { useState, useEffect } from 'react';
import { Siren, Ambulance, ShieldAlert, MapPin, Send, MessageSquare, RefreshCw, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import { EmergencyCategory } from '../types';

interface EmergencyPanelProps {
  contextText: string;
  category: EmergencyCategory;
}

export const EmergencyPanel: React.FC<EmergencyPanelProps> = ({ contextText, category }) => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  
  // Persist admin number in localStorage
  const [adminNumber, setAdminNumber] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sentimind_admin_number') || '8074563501';
    }
    return '8074563501';
  });
  const [isEditing, setIsEditing] = useState(false);
  const [tempNumber, setTempNumber] = useState(adminNumber);

  const fetchLocation = () => {
    setLocLoading(true);
    setLocError(null);

    if ('geolocation' in navigator) {
      const options = {
        enableHighAccuracy: true,
        timeout: 20000, // Increased to 20s to prevent premature timeouts
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocLoading(false);
        },
        (error) => {
          console.error("Location error details:", error.message); 
          
          let errorMessage = "Location unavailable.";
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Permission denied. Enable location.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location signal unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out.";
              break;
            default:
              errorMessage = "Unknown location error.";
          }
          
          setLocError(errorMessage);
          setLocLoading(false);
        },
        options
      );
    } else {
      setLocError("Geolocation not supported by browser.");
      setLocLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  const handleSaveNumber = () => {
    if (tempNumber.trim()) {
      setAdminNumber(tempNumber);
      localStorage.setItem('sentimind_admin_number', tempNumber);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setTempNumber(adminNumber);
    setIsEditing(false);
  };

  const getMessageBody = () => {
     const mapLink = location ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : 'Location unavailable';
     return `🚨 EMERGENCY ALERT (${category.toUpperCase()}) 🚨\n\n` +
      `Negative sentiment detected.\n` +
      `Context: "${contextText.slice(0, 100)}..."\n\n` +
      `Location: ${mapLink}\n\n` +
      `Please send help.`;
  };

  const handleSendWhatsApp = () => {
    if (!location) {
      if(!confirm("Location not yet available. Send anyway?")) return;
    }
    const text = encodeURIComponent(getMessageBody());
    window.open(`https://wa.me/${adminNumber}?text=${text}`, '_blank');
  };

  const handleSendSMS = () => {
    if (!location) {
      if(!confirm("Location not yet available. Send anyway?")) return;
    }
    const text = encodeURIComponent(getMessageBody());
    // Use _self to open default SMS app properly on mobile
    window.open(`sms:${adminNumber}?&body=${text}`, '_self'); 
  };

  const showPolice = category === 'Safety' || category === 'General';
  const showAmbulance = category === 'Health' || category === 'General';

  return (
    <div className="mt-6 bg-red-950/30 border border-red-500/50 rounded-xl p-5 animate-pulse-slow">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
          {category === 'Health' ? <Ambulance className="w-6 h-6" /> : 
           category === 'Safety' ? <Siren className="w-6 h-6" /> : 
           <ShieldAlert className="w-6 h-6" />}
        </div>
        <div>
          <h3 className="text-lg font-bold text-red-100">
            {category === 'Health' ? 'Medical Alert Detected' : 
             category === 'Safety' ? 'Safety Alert Detected' : 
             'Safety Actions Recommended'}
          </h3>
          <p className="text-xs text-red-300">
            Negative sentiment detected ({category}). Quick actions enabled.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Location Status */}
        <div className="flex items-center justify-between gap-2 text-sm bg-black/20 p-3 rounded-lg border border-red-500/10">
          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 ${location ? 'text-green-400' : 'text-gray-400'}`} />
            {locLoading ? (
              <span className="text-gray-400">Fetching current location...</span>
            ) : location ? (
              <span className="text-gray-200">
                Location Secured: <span className="font-mono text-xs opacity-75">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
              </span>
            ) : (
              <span className="text-red-400">{locError}</span>
            )}
          </div>
          {(!location || locError) && !locLoading && (
            <button 
              onClick={fetchLocation} 
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-red-300"
              title="Retry Location"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Grid - Public Services - CONDITIONAL RENDERING */}
        <div className={`grid ${showPolice && showAmbulance ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
          {showPolice && (
            <a href="tel:100" className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white p-3 rounded-lg font-bold transition-colors shadow-lg shadow-red-900/20">
              <Siren className="w-5 h-5" />
              <span className="text-sm">Call Police (100)</span>
            </a>
          )}
          
          {showAmbulance && (
            <a href="tel:102" className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg font-bold transition-colors shadow-lg shadow-blue-900/20">
              <Ambulance className="w-5 h-5" />
              <span className="text-sm">Call Ambulance (102)</span>
            </a>
          )}
        </div>

        {/* Admin Contact Section */}
        <div className="pt-4 border-t border-red-500/20 space-y-3">
           <div className="flex flex-col gap-2">
             <div className="flex items-center justify-between">
               <label className="text-xs text-red-300 font-medium">Admin / Emergency Contact</label>
               {!isEditing && (
                 <button 
                   onClick={() => setIsEditing(true)} 
                   className="text-red-400 hover:text-red-200 transition-colors p-1"
                   title="Edit Number"
                 >
                   <Edit2 className="w-3 h-3" />
                 </button>
               )}
             </div>

             {isEditing ? (
               <div className="flex gap-2">
                 <input 
                    type="text" 
                    value={tempNumber} 
                    onChange={(e) => setTempNumber(e.target.value)}
                    className="flex-1 bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 outline-none placeholder-red-500/30"
                    placeholder="Enter Mobile Number"
                    autoFocus
                 />
                 <button 
                   onClick={handleSaveNumber}
                   className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg border border-green-500/30 transition-colors"
                   title="Save"
                 >
                   <Check className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={handleCancelEdit}
                   className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/30 transition-colors"
                   title="Cancel"
                 >
                   <X className="w-4 h-4" />
                 </button>
               </div>
             ) : (
               <div className="w-full bg-black/20 border border-red-500/10 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono tracking-wide">
                 {adminNumber}
               </div>
             )}
           </div>
           
           <div className="grid grid-cols-2 gap-3 mt-1">
             <button 
               onClick={handleSendWhatsApp}
               className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               disabled={!adminNumber || isEditing}
             >
               <Send className="w-4 h-4" />
               WhatsApp
             </button>
             <button 
               onClick={handleSendSMS}
               className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               disabled={!adminNumber || isEditing}
             >
               <MessageSquare className="w-4 h-4" />
               SMS
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};