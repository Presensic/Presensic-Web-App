import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  MapPin, 
  Search, 
  Navigation, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  LocateFixed,
  Map as MapIcon
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in Leaflet + Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

interface LocationPickerProps {
  onConfirm: (lat: number, lng: number, accuracy: number | null) => void;
  initialLat?: number | null;
  initialLng?: number | null;
}

export default function LocationPicker({ onConfirm, initialLat, initialLng }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number]>(
    initialLat && initialLng ? [initialLat, initialLng] : [19.0760, 72.8777] // Default to Mumbai
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Map controller component
  function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    map.setView(center, 15);
    return null;
  }

  // Draggable marker logic
  const DraggableMarker = () => {
    const markerRef = useRef<L.Marker>(null);
    const eventHandlers = useCallback(() => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setPosition([newPos.lat, newPos.lng]);
          setIsConfirmed(false);
        }
      },
    }), []);

    return (
      <Marker
        draggable={true}
        eventHandlers={eventHandlers()}
        position={position}
        ref={markerRef}
      />
    );
  };

  const handleSearchAction = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      setSearchResults(data);
      if (data.length === 0) {
        setError("No locations found. Try a more specific address.");
      }
    } catch (err) {
      setError("Search failed. Please check your connection.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchAction();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchAction();
    }
  };

  const selectResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setPosition([lat, lon]);
    setSearchResults([]);
    setSearchQuery(result.display_name);
    setAccuracy(null);
    setIsConfirmed(false);
  };

  const handleGPS = () => {
    setIsLocating(true);
    setError(null);
    setAccuracy(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setPosition([latitude, longitude]);
          setAccuracy(accuracy);
          setIsLocating(false);
          setIsConfirmed(false);
          
          if (accuracy > 30) {
            setError(`GPS accuracy is low (±${accuracy.toFixed(0)}m). Please adjust the pin manually if it looks wrong.`);
          }
        },
        (err) => {
          setError("Failed to get GPS. Please allow location access.");
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    } else {
      setError("Geolocation is not supported.");
      setIsLocating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search office address or area..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none transition-all"
            />
          </div>
          <button
            type="button"
            onClick={handleSearchAction}
            disabled={isSearching}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            {isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
            Search
          </button>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-[1000] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {searchResults.map((res, i) => (
              <button
                key={`loc-res-${res.place_id || res.osm_id || 'item'}-${i}`}
                onClick={() => selectResult(res)}
                className="w-full text-left px-4 py-2.5 text-[11px] hover:bg-slate-50 border-b border-slate-100 last:border-none flex items-start gap-2"
              >
                <MapPin className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
                <span className="text-slate-700 line-clamp-2">{res.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Area */}
      <div className="relative group">
        <div className="h-64 w-full rounded-2xl border border-slate-200 overflow-hidden shadow-inner bg-slate-100 z-0">
          <MapContainer 
            center={position} 
            zoom={15} 
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ChangeView center={position} />
            <DraggableMarker />
          </MapContainer>
        </div>

        {/* GPS Float Button */}
        <button
          type="button"
          onClick={handleGPS}
          disabled={isLocating}
          className="absolute bottom-4 right-4 z-[999] bg-white text-slate-900 h-10 w-10 rounded-xl shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
          title="Use My Current GPS Location"
        >
          {isLocating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
        </button>

        {/* Map Tip Overlay */}
        <div className="absolute top-4 left-4 z-[999] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-[9px] font-medium">
            Tip: Drag the pin to adjust position
          </div>
        </div>
      </div>

      {/* Info & Confirmation */}
      <div className="space-y-3">
        <div className="flex items-start justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <LocateFixed className="h-3.5 w-3.5 text-brand-600" />
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">Selected Coordinates</span>
            </div>
            <p className="text-xs font-mono font-medium text-slate-900">
              {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </p>
          </div>
          {accuracy !== null && (
            <div className="text-right space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase">GPS Accuracy</span>
              <p className={`text-xs font-mono font-medium ${accuracy > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                ±{accuracy.toFixed(0)}m
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className={`flex items-start gap-2 p-3 rounded-xl border ${accuracy && accuracy > 30 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
            <AlertCircle className={`h-4 w-4 shrink-0 mt-0.5 ${accuracy && accuracy > 30 ? 'text-amber-600' : 'text-red-600'}`} />
            <p className={`text-[10px] leading-relaxed font-medium ${accuracy && accuracy > 30 ? 'text-amber-700' : 'text-red-700'}`}>
              {error}
            </p>
          </div>
        )}

        {!isConfirmed ? (
          <button
            type="button"
            onClick={() => {
              setIsConfirmed(true);
              onConfirm(position[0], position[1], accuracy);
            }}
            className="w-full bg-brand-600 text-white rounded-xl py-3 text-xs font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-600/10 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirm This Office Location
          </button>
        ) : (
          <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Location Confirmed
            <button 
              type="button" 
              onClick={() => setIsConfirmed(false)}
              className="ml-2 text-[10px] underline hover:text-emerald-900"
            >
              Change
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
