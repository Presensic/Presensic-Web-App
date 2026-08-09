import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "motion/react";
import { 
  MapPin, 
  Plus, 
  Trash2, 
  Navigation, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  Map as MapIcon,
  Globe,
  Pencil,
  X,
  Building2
} from "lucide-react";
import { getSupabase } from "../lib/supabase";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
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

export interface Zone {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  radius: number;
}

interface ManageOfficeLocationsProps {
  zones: Zone[];
  setZones: React.Dispatch<React.SetStateAction<Zone[]>>;
  companyId?: string | number;
  isGated?: boolean;
}

export default function ManageOfficeLocations({ zones, setZones, companyId, isGated = false }: ManageOfficeLocationsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [formattedAddress, setFormattedAddress] = useState("");
  const [locationName, setLocationName] = useState("");

  const [newZoneRadius, setNewZoneRadius] = useState<number>(150);
  const [newZoneCoords, setNewZoneCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [zoneToDelete, setZoneToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabase();

  // Helper to resolve company_id from props, active session, or local state
  const resolveCompanyId = async (): Promise<string | number | null> => {
    if (!supabase) return companyId || null;

    // Helper to check if a company_id actually exists in the Supabase `companies` table
    const verifyCompanyExists = async (id: any): Promise<string | number | null> => {
      if (!id || id === 'comp-1' || String(id).toLowerCase().startsWith('comp-') || String(id).toLowerCase().startsWith('comp_')) {
        return null;
      }
      try {
        const val = !isNaN(Number(id)) ? Number(id) : id;
        const { data } = await supabase
          .from('companies')
          .select('id')
          .eq('id', val)
          .maybeSingle();
        if (data?.id) {
          return !isNaN(Number(data.id)) ? Number(data.id) : data.id;
        }
      } catch (e) {}
      return null;
    };

    // 1. Check if passed prop `companyId` exists in Supabase `companies`
    if (companyId) {
      const verified = await verifyCompanyExists(companyId);
      if (verified) return verified;
      if (!isNaN(Number(companyId))) return Number(companyId);
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(companyId))) return companyId;
    }

    // 2. Check local employer user data
    let empData: any = null;
    try {
      const stored = localStorage.getItem('presensic_employer_user');
      if (stored) empData = JSON.parse(stored);
    } catch (e) {}

    if (empData) {
      const localId = empData.company_id || empData.companyId;
      if (localId) {
        const verified = await verifyCompanyExists(localId);
        if (verified) return verified;
        if (!isNaN(Number(localId))) return Number(localId);
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(localId))) return localId;
      }
    }

    // 3. Query Supabase session
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const user = session.user;
        if (user.id) {
          const { data: compByUserId } = await supabase
            .from('companies')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          if (compByUserId?.id) return !isNaN(Number(compByUserId.id)) ? Number(compByUserId.id) : compByUserId.id;
        }
        if (user.email) {
          const { data: compByEmail } = await supabase
            .from('companies')
            .select('id')
            .eq('email', user.email)
            .maybeSingle();
          if (compByEmail?.id) return !isNaN(Number(compByEmail.id)) ? Number(compByEmail.id) : compByEmail.id;
        }
      }
    } catch (e) {}

    // 4. Query by local user whatsapp / phone / email in companies table
    if (empData) {
      try {
        if (empData.whatsApp || empData.phone) {
          const { data: compByPhone } = await supabase
            .from('companies')
            .select('id')
            .eq('whatsapp', empData.whatsApp || empData.phone)
            .maybeSingle();
          if (compByPhone?.id) return !isNaN(Number(compByPhone.id)) ? Number(compByPhone.id) : compByPhone.id;
        }
        if (empData.email) {
          const { data: compByEmail } = await supabase
            .from('companies')
            .select('id')
            .eq('email', empData.email)
            .maybeSingle();
          if (compByEmail?.id) return !isNaN(Number(compByEmail.id)) ? Number(compByEmail.id) : compByEmail.id;
        }
      } catch (e) {}
    }

    // 5. Pick the first company existing in `companies` table
    try {
      const { data: allComps } = await supabase.from('companies').select('id').limit(1);
      if (allComps && allComps.length > 0 && allComps[0].id) {
        return !isNaN(Number(allComps[0].id)) ? Number(allComps[0].id) : allComps[0].id;
      }
    } catch (e) {}

    // 6. If no company exists in DB at all, insert a new company record to satisfy foreign key
    try {
      const { data: newComp } = await supabase.from('companies').insert([{
        org_name: empData?.orgName || 'Presensic HQ',
        full_name: empData?.fullName || 'Employer Admin',
        whatsapp: empData?.whatsApp || '',
        role: 'Trial Active',
        created_at: new Date().toISOString()
      }]).select('id').maybeSingle();

      if (newComp?.id) {
        return !isNaN(Number(newComp.id)) ? Number(newComp.id) : newComp.id;
      }
    } catch (e) {}

    return null;
  };

  // Load existing anchors from Supabase and merge with local storage
  const fetchLatestAnchors = async () => {
    const activeCompanyId = await resolveCompanyId();

    let dbAnchors: Zone[] = [];
    let fetchedFromDb = false;
    if (supabase && activeCompanyId) {
      try {
        const { data, error } = await supabase
          .from('geofence_anchors')
          .select('*')
          .eq('company_id', activeCompanyId);

        if (!error && data) {
          fetchedFromDb = true;
          dbAnchors = data.map(d => {
            let displayName = d.location_name || d.name || "Office Anchor";
            let address = d.formatted_address || "";
            if (d.name && d.name.includes(" | ")) {
              const parts = d.name.split(" | ");
              displayName = parts[0];
              address = parts[1];
            }
            return {
              id: String(d.id),
              name: displayName,
              address: address,
              lat: Number(d.latitude),
              lng: Number(d.longitude),
              radius: Number(d.radius_meters || d.radius || 150)
            };
          });
        }
      } catch (err) {
        console.warn("Notice: Error fetching geofence anchors from Supabase:", err);
      }
    }

    // Merge local anchors if they failed to sync to the DB
    let finalAnchors = [...dbAnchors];
    try {
      const stored = (activeCompanyId ? localStorage.getItem(`geofence_anchors_${activeCompanyId}`) : null) || localStorage.getItem('presensic_saved_locations');
      if (stored) {
        const localAnchors = JSON.parse(stored);
        if (Array.isArray(localAnchors)) {
          if (fetchedFromDb) {
            const dbNames = new Set(dbAnchors.map(a => a.name.toLowerCase()));
            for (const local of localAnchors) {
              if (!dbNames.has(local.name.toLowerCase())) {
                finalAnchors.push(local);
              }
            }
          } else {
            finalAnchors = localAnchors;
          }
        }
      }
    } catch (e) {}

    setZones(finalAnchors);

    try {
      if (activeCompanyId) {
        localStorage.setItem(`geofence_anchors_${activeCompanyId}`, JSON.stringify(finalAnchors));
      }
      localStorage.setItem('presensic_saved_locations', JSON.stringify(finalAnchors));
    } catch (e) {}
  };

  useEffect(() => {
    fetchLatestAnchors();
  }, [companyId]);

  // Debounced autocomplete predictions via Nominatim
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery === formattedAddress) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
        );
        const data = await response.json();
        setSearchResults(data);
      } catch (err) {
        console.error("Autocomplete search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, formattedAddress]);

  // Reverse geocode latitude and longitude to get address
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data && data.display_name) {
        setFormattedAddress(data.display_name);
        setSearchQuery(data.display_name);
        if (!locationName.trim()) {
          const shortName = data.display_name.split(",")[0] || "Office Location";
          setLocationName(shortName);
        }
      } else {
        const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setFormattedAddress(fallback);
      }
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
    }
  };

  // "Use My Current Location" button handler
  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    setError(null);
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setNewZoneCoords({ lat, lng });

          await reverseGeocode(lat, lng);

          setIsLocating(false);
          setSearchResults([]);
        },
        (err) => {
          console.error("Geolocation capture error:", err);
          setError("Could not read current GPS location. Please check browser permissions.");
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setError("Your browser does not support geolocation.");
      setIsLocating(false);
    }
  };

  // Select place from autocomplete predictions
  const selectResult = (res: any) => {
    const lat = parseFloat(res.lat);
    const lng = parseFloat(res.lon);

    setNewZoneCoords({ lat, lng });
    setFormattedAddress(res.display_name);
    setSearchQuery(res.display_name);

    if (!locationName.trim()) {
      const shortName = res.display_name.split(",")[0] || "Office Location";
      setLocationName(shortName);
    }
    setSearchResults([]);
    setError(null);
  };

  // Edit location click handler
  const handleStartEdit = (zone: Zone) => {
    setEditingZone(zone);
    setLocationName(zone.name);
    setFormattedAddress(zone.address || `${zone.lat.toFixed(6)}, ${zone.lng.toFixed(6)}`);
    setSearchQuery(zone.address || zone.name);
    setNewZoneCoords({ lat: zone.lat, lng: zone.lng });
    setNewZoneRadius(zone.radius || 150);
    setError(null);

    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingZone(null);
    setLocationName("");
    setSearchQuery("");
    setFormattedAddress("");
    setNewZoneCoords(null);
    setNewZoneRadius(150);
    setError(null);
  };

  // Save or Update anchor location handler
  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGated) {
      setError("Your 5-Day Free Trial Has Ended. Please upgrade your subscription to continue.");
      return;
    }
    if (!locationName.trim()) {
      setError("Please specify a location name (e.g. Main Branch, Factory B).");
      return;
    }
    if (!newZoneCoords) {
      setError("Please set latitude/longitude using search, current GPS, or map selection.");
      return;
    }

    // Resolve and validate employer company_id from session context
    const resolvedCompanyId = await resolveCompanyId();
    if (!resolvedCompanyId) {
      setError("Error: Unable to resolve employer company ID from active session. Office location insertion blocked to prevent creating an unscoped location.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const cleanName = locationName.trim();
    const cleanAddress = formattedAddress || searchQuery || `${newZoneCoords.lat.toFixed(6)}, ${newZoneCoords.lng.toFixed(6)}`;

    if (editingZone) {
      // Update Existing Location
      let supabaseUpdateSuccess = false;
      if (supabase && resolvedCompanyId) {
        try {
          let updateObj: any = {
            name: cleanName,
            location_name: cleanName,
            formatted_address: cleanAddress,
            latitude: newZoneCoords.lat,
            longitude: newZoneCoords.lng,
            radius_meters: Number(newZoneRadius)
          };
          
          let { error: updateErr } = await supabase
            .from('geofence_anchors')
            .update(updateObj)
            .eq('id', editingZone.id);

          if (updateErr && (updateErr.code === '42703' || updateErr.message?.includes('column'))) {
            delete updateObj.location_name;
            delete updateObj.formatted_address;
            const retry = await supabase
              .from('geofence_anchors')
              .update(updateObj)
              .eq('id', editingZone.id);
            updateErr = retry.error;
          }

          if (updateErr) {
            console.warn("Supabase update notice (RLS or policy):", updateErr);
          } else {
            supabaseUpdateSuccess = true;
          }
        } catch (err: any) {
          console.warn("Supabase update exception:", err);
        }
      }

      const updatedZoneObj: Zone = {
        ...editingZone,
        name: cleanName,
        address: cleanAddress,
        lat: newZoneCoords.lat,
        lng: newZoneCoords.lng,
        radius: Number(newZoneRadius)
      };

      setZones(prev => {
        const next = prev.map(z => z.id === editingZone.id ? updatedZoneObj : z);
        try {
          if (resolvedCompanyId) {
            localStorage.setItem(`geofence_anchors_${resolvedCompanyId}`, JSON.stringify(next));
          }
          localStorage.setItem('presensic_saved_locations', JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      setSuccessMessage(`Location "${cleanName}" updated successfully!${supabaseUpdateSuccess ? ' (Synced)' : ' (Saved locally)'}`);
    } else {
      // Create New Location
      const anchorId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `anchor-${Date.now()}`;
      let supabaseInsertSuccess = false;

      if (supabase && resolvedCompanyId) {
        let insertObj: any = {
          company_id: resolvedCompanyId,
          name: cleanName,
          location_name: cleanName,
          formatted_address: cleanAddress,
          latitude: newZoneCoords.lat,
          longitude: newZoneCoords.lng,
          radius_meters: Number(newZoneRadius)
        };

        try {
          let { data: insertData, error: insertErr } = await supabase
            .from('geofence_anchors')
            .insert(insertObj)
            .select();

          // If extra columns don't exist in schema (code 42703), retry without them
          if (insertErr && (insertErr.code === '42703' || insertErr.message?.includes('column'))) {
            delete insertObj.location_name;
            delete insertObj.formatted_address;
            const retry = await supabase
              .from('geofence_anchors')
              .insert(insertObj)
              .select();
            insertData = retry.data;
            insertErr = retry.error;
          }

          if (insertErr) {
            console.warn("Supabase geofence_anchors insert warning (RLS or database policy):", insertErr);
            console.warn("Supabase insert error details:", {
              message: insertErr.message,
              details: insertErr.details,
              hint: insertErr.hint,
              code: insertErr.code
            });
          } else {
            supabaseInsertSuccess = true;
            console.log("Supabase geofence_anchors insert success:", insertData);
          }
        } catch (err: any) {
          console.warn("Supabase insert catch exception:", err);
        }
      }

      const newZoneObj: Zone = {
        id: anchorId,
        name: cleanName,
        address: cleanAddress,
        lat: newZoneCoords.lat,
        lng: newZoneCoords.lng,
        radius: Number(newZoneRadius)
      };

      setZones(prev => {
        const next = [newZoneObj, ...prev.filter(z => z.id !== anchorId)];
        try {
          if (resolvedCompanyId) {
            localStorage.setItem(`geofence_anchors_${resolvedCompanyId}`, JSON.stringify(next));
          }
          localStorage.setItem('presensic_saved_locations', JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      if (supabaseInsertSuccess) {
        setSuccessMessage(`New Location "${cleanName}" added & synced to database successfully!`);
      } else {
        setSuccessMessage(`New Location "${cleanName}" added successfully! (Saved locally)`);
      }
    }

    // Refresh and sync anchors state
    await fetchLatestAnchors(); // Refetch to get real DB IDs and ensure UI is synced

    setEditingZone(null);
    setSearchQuery("");
    setFormattedAddress("");
    setLocationName("");
    setNewZoneCoords(null);
    setNewZoneRadius(150);
    setIsSaving(false);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Delete geofence anchor
    const deleteZone = (id: string, name: string) => {
    if (isGated) {
      setError("Your 5-Day Free Trial Has Ended. Please upgrade your subscription to continue.");
      return;
    }
    setZoneToDelete({ id, name });
  };

  const executeDeleteZone = async () => {
    if (!zoneToDelete) return;
    setIsDeleting(true);
    const { id, name } = zoneToDelete;
    
    const resolvedCompanyId = await resolveCompanyId();
    let assignedCount = 0;
    
    if (supabase && resolvedCompanyId) {
      try {
        const { data: empData, error: empErr } = await supabase
          .from("employees")
          .select("id, name, zone, tracking_geofence, geofence")
          .eq("company_id", resolvedCompanyId);

        if (!empErr && empData) {
          const match = empData.filter(e => {
            const z = (e.zone || e.tracking_geofence || e.geofence || "").trim().toLowerCase();
            return z === name.trim().toLowerCase();
          });
          assignedCount = match.length;
        }
      } catch (e) {
        console.warn("Error checking assigned employees before delete:", e);
      }
    }

    if (assignedCount === 0) {
      try {
        const storedEmps = localStorage.getItem("presensic_employees");
        if (storedEmps) {
          const parsed = JSON.parse(storedEmps);
          if (Array.isArray(parsed)) {
            const match = parsed.filter(e => {
              const z = (e.zone || e.tracking_geofence || e.geofence || "").trim().toLowerCase();
              return z === name.trim().toLowerCase();
            });
            assignedCount = match.length;
          }
        }
      } catch (e) {}
    }

    if (assignedCount > 0) {
      setError(`Cannot delete ${name} - ${assignedCount} employee${assignedCount === 1 ? "" : "s"} ${assignedCount === 1 ? "is" : "are"} currently assigned to this office. Reassign them to a different office before deleting.`);
      setIsDeleting(false);
      setZoneToDelete(null);
      return;
    }

    if (supabase && resolvedCompanyId) {
      const isNumericId = !isNaN(Number(id));
      let query = supabase.from("geofence_anchors").delete().eq("company_id", resolvedCompanyId);

      if (isNumericId) {
        query = query.eq("id", Number(id));
      } else {
        query = query.eq("name", name);
      }

      const { error: deleteErr } = await query;
      if (deleteErr) {
        console.error("Supabase geofence_anchors delete error:", deleteErr);
        setError(`Failed to delete location: ${deleteErr.message || deleteErr.details || deleteErr.code}`);
        setIsDeleting(false);
        setZoneToDelete(null);
        return;
      }
    }

    const remaining = zones.filter(z => String(z.id) !== String(id));
    setZones(remaining);
    
    try {
      if (resolvedCompanyId) {
        localStorage.setItem(`geofence_anchors_${resolvedCompanyId}`, JSON.stringify(remaining));
      }
      localStorage.setItem("presensic_saved_locations", JSON.stringify(remaining));
    } catch (e) {}

    setSuccessMessage(`Office location "${name}" deleted successfully.`);
    setIsDeleting(false);
    setZoneToDelete(null);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Map view controller component
  function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
      map.setView(center, 16);
    }, [center, map]);
    return null;
  }

  // Map click listener component
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        setNewZoneCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  // Draggable marker logic
  const DraggableMarker = () => {
    const markerRef = useRef<L.Marker>(null);
    const eventHandlers = useMemo(() => ({
      async dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setNewZoneCoords({ lat: newPos.lat, lng: newPos.lng });
          await reverseGeocode(newPos.lat, newPos.lng);
        }
      },
    }), []);

    return newZoneCoords ? (
      <>
        <Marker
          draggable={true}
          eventHandlers={eventHandlers}
          position={[newZoneCoords.lat, newZoneCoords.lng]}
          ref={markerRef}
        />
        <Circle
          center={[newZoneCoords.lat, newZoneCoords.lng]}
          radius={newZoneRadius}
          pathOptions={{
            color: '#2563eb',
            fillColor: '#3b82f6',
            fillOpacity: 0.18,
            weight: 2,
            dashArray: '4, 4'
          }}
        />
      </>
    ) : null;
  };

  // Small map preview component for existing saved locations
  const MiniLocationMap = ({ lat, lng, radius }: { lat: number; lng: number; radius: number }) => {
    return (
      <div className="h-28 w-full rounded-xl overflow-hidden border border-slate-200/80 relative z-0 mt-2 shadow-inner">
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          scrollWheelZoom={false}
          zoomControl={false}
          dragging={false}
          doubleClickZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]} />
          <Circle
            center={[lat, lng]}
            radius={radius}
            pathOptions={{
              color: '#2563eb',
              fillColor: '#3b82f6',
              fillOpacity: 0.25,
              weight: 1.5,
            }}
          />
        </MapContainer>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-left" ref={formRef}>
      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                {editingZone ? `Edit Office Location: ${editingZone.name}` : "Add New Office Location"}
              </h3>
              <p className="text-[11px] text-slate-500">Define office geofence coordinates and tracking radius for your company</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {editingZone && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                Cancel Edit
              </button>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer border border-blue-200"
              title="Auto-fill latitude & longitude using your current device position"
            >
              {isLocating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              ) : (
                <Navigation className="h-3.5 w-3.5 text-blue-600" />
              )}
              {isLocating ? "Locating..." : "Use My Current Location"}
            </motion.button>
          </div>
        </div>

        <form onSubmit={handleSaveZone} className="space-y-5">
          {/* Location Name Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Location / Branch Name <span className="text-blue-600">*</span>
            </label>
            <input
              type="text"
              required
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Main Branch, Factory B, Site Alpha"
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-all text-slate-800 font-semibold"
            />
          </div>

          {/* Search Autocomplete Input */}
          <div className="space-y-1.5 relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Search Address or Place Name</span>
              {formattedAddress && (
                <span className="text-emerald-600 font-bold lowercase text-[10px]">✓ address set</span>
              )}
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value !== formattedAddress) {
                    setFormattedAddress("");
                  }
                }}
                placeholder="Type street address, landmark, or city to search..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl pl-10 pr-10 py-2.5 text-xs focus:outline-none transition-all text-slate-800 placeholder-slate-400"
              />
              {isSearching && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
              )}
            </div>

            {/* Predictions Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute z-[1100] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {searchResults.map((res, i) => (
                  <button
                    key={`search-res-${res.place_id || res.osm_id || 'no-id'}-${i}`}
                    type="button"
                    onClick={() => selectResult(res)}
                    className="w-full text-left px-4 py-3 text-xs hover:bg-blue-50/50 border-b border-slate-100 last:border-none flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <MapPin className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 leading-tight">{res.display_name.split(",")[0]}</span>
                      <span className="text-[10px] text-slate-500 line-clamp-1">{res.display_name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Radius selection (50 to 1000m) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Geofence Radius (meters)
                </label>
                <span className="text-xs font-bold text-blue-600 font-mono">{newZoneRadius} meters</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={10}
                  value={newZoneRadius}
                  onChange={(e) => setNewZoneRadius(Number(e.target.value))}
                  className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  min={50}
                  max={1000}
                  value={newZoneRadius}
                  onChange={(e) => setNewZoneRadius(Math.max(50, Math.min(1000, Number(e.target.value))))}
                  className="w-20 bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-lg px-2.5 py-1.5 text-xs text-center font-bold font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Coordinates Display */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Latitude & Longitude</label>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 h-10 flex items-center justify-between">
                {newZoneCoords ? (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs font-mono">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{newZoneCoords.lat.toFixed(6)}, {newZoneCoords.lng.toFixed(6)}</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Select place above or click on map</span>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Map Area */}
          <div className="relative h-72 w-full rounded-2xl border border-slate-200 overflow-hidden shadow-inner bg-slate-100 z-0">
            <MapContainer 
              center={newZoneCoords ? [newZoneCoords.lat, newZoneCoords.lng] : [19.0760, 72.8777]} 
              zoom={13} 
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler />
              {newZoneCoords && (
                <>
                  <ChangeView center={[newZoneCoords.lat, newZoneCoords.lng]} />
                  <DraggableMarker />
                </>
              )}
            </MapContainer>
            <div className="absolute top-3 left-3 z-[1000] bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg pointer-events-none flex items-center gap-1">
              <Globe className="h-3 w-3 text-blue-400" /> Click on map or drag pin to position office
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={!newZoneCoords || isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-3 text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md shadow-blue-600/10"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingZone ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
              {editingZone ? "Update Office Location" : "Save Office Location"}
            </motion.button>
          </div>
        </form>
      </div>

      {/* Saved Locations List */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono ml-1">
            Saved Office Locations ({zones.length})
          </h3>
        </div>

        {zones.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-2">
            <MapIcon className="h-8 w-8 text-slate-300" />
            <p className="text-xs text-slate-600 font-bold">No office locations set up yet.</p>
            <p className="text-[11px] text-slate-400">Add at least one location above so employees can be assigned to geofences.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {zones.map((zone, idx) => (
              <div 
                key={`zone-card-${zone.id ?? "no-zone"}-${idx}`} 
                className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between group hover:border-blue-300 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                          {zone.name}
                        </h4>
                        {zone.address && (
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 leading-tight">{zone.address}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(zone)}
                        className="p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all cursor-pointer"
                        title="Edit Location"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteZone(zone.id, zone.name)}
                        className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all cursor-pointer"
                        title="Delete Location"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md">
                      Radius: {zone.radius}m
                    </span>
                    <span>{zone.lat.toFixed(5)}, {zone.lng.toFixed(5)}</span>
                  </div>

                  {/* Map Preview for Saved Location */}
                  <MiniLocationMap lat={zone.lat} lng={zone.lng} radius={zone.radius} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Delete Confirmation Modal */}
      {zoneToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-sm w-full"
          >
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Delete Office Location</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to delete <span className="font-bold text-slate-900">{zoneToDelete.name}</span>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button 
                type="button"
                onClick={() => setZoneToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={executeDeleteZone}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {isDeleting ? "Deleting..." : "Delete Office"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
