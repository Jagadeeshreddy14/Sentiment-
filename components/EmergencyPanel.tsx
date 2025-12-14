import React, { useState, useEffect } from 'react';
import { Siren, Ambulance, ShieldAlert, MapPin, Send, Phone } from 'lucide-react';

interface EmergencyPanelProps {
  contextText: string;
}

export const EmergencyPanel: React.FC<EmergencyPanelProps> = ({ contextText }) => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [adminNumber, setAdminNumber] = useState('8074563501'); // Default updated to user request

  useEffect(() => {
    // Auto-fetch location on mount
    setLocLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocLoading(false);
        },
        (error) => {
          console.error("Location error:", error);
          setLocError("Location access denied or unavailable.");
          setLocLoading(false);
        }
      );
    } else {
      setLocError("Geolocation not supported.");
      setLocLoading(false);
    }
  }, []);

  const handleSendToAdmin = () => {
    if (!location) {
      alert("Waiting for location...");
      return;
    }
    
    const mapLink = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    const message = `🚨 *EMERGENCY ALERT* 🚨%0A%0A` +
      `Negative sentiment detected in user interaction.%0A` +
      `*Context:* "${contextText.slice(0, 100)}..."%0A%0A` +
      `*Current Location:* ${mapLink}%0A%0A` +
      `Please send assistance immediately.`;
    
    // Open WhatsApp
    window.open(`https://wa.me/${adminNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="mt-6 bg-red-950/30 border border-red-500/50 rounded-xl p-5 animate-pulse-slow">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-red-100">Safety Actions Recommended</h3>
          <p className="text-xs text-red-300">Negative sentiment detected. Quick actions enabled.</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Location Status */}
        <div className="flex items-center gap-2 text-sm bg-black/20 p-3 rounded-lg border border-red-500/10">
          <MapPin className={`w-4 h-4 ${location ? 'text-green-400' : 'text-gray-400'}`} />
          {locLoading ? (
            <span className="text-gray-400">Fetching current location...</span>
          ) : location ? (
            <span className="text-gray-200">
              Location Secured: <span className="font-mono text-xs opacity-75">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
            </span>
          ) : (
            <span className="text-red-400">{locError || "Location unavailable"}</span>
          )}
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="tel:100" className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white p-3 rounded-lg font-bold transition-colors shadow-lg shadow-red-900/20">
            <Siren className="w-5 h-5" />
            Call Police (100)
          </a>
          
          <a href="tel:102" className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg font-bold transition-colors shadow-lg shadow-blue-900/20">
            <Ambulance className="w-5 h-5" />
            Call Ambulance (102)
          </a>
        </div>

        {/* Admin Message */}
        <div className="pt-2 border-t border-red-500/20">
           <label className="block text-xs text-red-300 mb-1">Admin / Emergency Contact Number</label>
           <div className="flex gap-2">
             <input 
                type="text" 
                value={adminNumber} 
                onChange={(e) => setAdminNumber(e.target.value)}
                className="bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 outline-none w-32"
                placeholder="Number"
             />
             <button 
               onClick={handleSendToAdmin}
               disabled={!location}
               className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors"
             >
               <Send className="w-4 h-4" />
               Share Location via WhatsApp
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};