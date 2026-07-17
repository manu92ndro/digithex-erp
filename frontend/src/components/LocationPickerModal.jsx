import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { X, Search, MapPin, CheckCircle } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const defaultPosition = [40.76758763045124, -74.24561955952555];

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

function MapRecenter({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 16);
      setTimeout(() => map.invalidateSize(), 200);
    }
  }, [position, map]);

  return null;
}

export default function LocationPickerModal({
  open,
  onClose,
  initialAddress = "",
  initialLat = "",
  initialLng = "",
  onConfirm,
}) {
  const [search, setSearch] = useState(initialAddress || "");
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState("");
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (initialLat && initialLng) {
      setPosition([Number(initialLat), Number(initialLng)]);
      setAddress(initialAddress || "");
      setSearch(initialAddress || "");
    } else {
      setPosition(defaultPosition);
      setAddress("");
      setSearch(initialAddress || "");
    }
  }, [open, initialAddress, initialLat, initialLng]);

  const reverseGeocode = async (lat, lng) => {
    try {
      setLoadingAddress(true);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );

      const data = await res.json();

      if (data?.display_name) {
        setAddress(data.display_name);
        setSearch(data.display_name);
      } else {
        setAddress("");
      }
    } catch {
      setAddress("");
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleSelect = async (lat, lng) => {
    setPosition([lat, lng]);
    await reverseGeocode(lat, lng);
  };

  const buscarDireccion = async () => {
    if (!search.trim()) return;

    try {
      setSearching(true);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          search.trim()
        )}&limit=1`
      );

      const data = await res.json();

      if (data?.length > 0) {
        const lat = Number(data[0].lat);
        const lng = Number(data[0].lon);

        setPosition([lat, lng]);
        await reverseGeocode(lat, lng);
      } else {
        setAddress("");
      }
    } finally {
      setSearching(false);
    }
  };

  const confirmar = () => {
    if (!position || !address) return;

    onConfirm({
      direccion: address,
      latitud: position[0],
      longitud: position[1],
    });

    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-3">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl h-[88vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <MapPin size={18} />
              Seleccionar ubicación de entrega
            </h2>
            <p className="text-xs text-slate-500">
              Busca una dirección o haz clic en el mapa.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3 top-3 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    buscarDireccion();
                  }
                }}
                placeholder="Buscar dirección..."
                className="w-full border rounded-xl pl-10 pr-3 py-2"
              />
            </div>

            <button
              type="button"
              onClick={buscarDireccion}
              disabled={searching}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-60"
            >
              {searching ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
          <div className="lg:col-span-2 h-full min-h-[350px]">
            {position && (
              <MapContainer
                center={position}
                zoom={13}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickHandler onSelect={handleSelect} />
                <MapRecenter position={position} />

                <Marker
                  position={position}
                  draggable
                  eventHandlers={{
                    dragend: async (e) => {
                      const marker = e.target;
                      const latlng = marker.getLatLng();
                      await handleSelect(latlng.lat, latlng.lng);
                    },
                  }}
                />
              </MapContainer>
            )}
          </div>

          <div className="border-l p-4 bg-slate-50 overflow-auto">
            <h3 className="font-semibold text-slate-800 mb-3">
              Detalles seleccionados
            </h3>

            <div className="bg-white border rounded-xl p-3 mb-3">
              <p className="text-xs text-slate-500 mb-1">Dirección</p>
              <p className={address ? "text-green-700 font-medium" : "text-slate-400"}>
                {loadingAddress
                  ? "Obteniendo dirección..."
                  : address || "No hay dirección seleccionada"}
              </p>
            </div>

            <div className="bg-white border rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Coordenadas</p>
              <p className="text-slate-700 font-medium">
                {position
                  ? `Lat: ${position[0].toFixed(6)}, Lng: ${position[1].toFixed(6)}`
                  : "No hay coordenadas"}
              </p>
            </div>

            <button
              type="button"
              onClick={confirmar}
              disabled={!position || !address}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white disabled:opacity-50"
            >
              <CheckCircle size={18} />
              Confirmar ubicación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}