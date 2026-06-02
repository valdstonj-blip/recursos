import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GreResource } from '../types';
import { useEffect } from 'react';

// Fix for default marker icons in Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = new Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapComponentProps {
  resources: GreResource[];
  onMarkerClick: (resource: GreResource) => void;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
    map.invalidateSize();
  }, [center, map]);
  return null;
}

function MapAutoInvalidate() {
  const map = useMap();
  useEffect(() => {
    // Immediate invalidate
    map.invalidateSize();
    
    // Staggered invalidations to handle animations & modal transitions
    const timers = [50, 150, 300, 600, 1000].map(delay => 
      setTimeout(() => {
        map.invalidateSize();
      }, delay)
    );

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  return null;
}

export default function MapComponent({ resources, onMarkerClick }: MapComponentProps) {
  // Extract all valid resources that have coordinates
  const mapPoints = resources.filter(r => r.coords && r.coords.length === 2 && !isNaN(r.coords[0]) && !isNaN(r.coords[1]));

  // Default center: Centro do Rio (EMG sits near here)
  const defaultCenter: [number, number] = [-22.9068, -43.1729];
  const center = mapPoints.length > 0 ? mapPoints[0].coords : defaultCenter;

  return (
    <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden border border-slate-100 shadow-xl">
      <MapContainer 
        center={center} 
        zoom={11} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', background: '#F8FAFC' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <ChangeView center={center} />
        <MapAutoInvalidate />
        {mapPoints.map((point) => (
          <Marker 
            key={point.id} 
            position={point.coords} 
            icon={defaultIcon}
            eventHandlers={{
              click: () => onMarkerClick(point)
            }}
          >
            <Tooltip direction="top" offset={[0, -40]} opacity={0.95}>
              <div className="p-1.5 px-2.5 bg-slate-900 text-white rounded shadow-md text-left">
                <p className="text-[10px] font-black uppercase leading-none mb-1 text-[#38BDF8]">{point.unidadeApoiada}</p>
                <p className="text-[9px] font-bold text-slate-300 leading-tight uppercase line-clamp-1">{point.descricaoApoio}</p>
                <p className="text-[8px] font-medium text-slate-400 mt-1 uppercase">Equipe(s): {point.equipe}</p>
              </div>
            </Tooltip>
            <Popup minWidth={220}>
              <div className="p-3">
                <span className="inline-block text-[8px] px-2 py-0.5 bg-[#0F172A] text-[#38BDF8] rounded-xl font-bold uppercase tracking-wider mb-1.5">{point.status}</span>
                <p className="text-[12px] font-extrabold text-slate-900 uppercase mb-0.5 leading-tight">{point.unidadeApoiada}</p>
                <p className="text-[11px] font-semibold text-slate-600 uppercase mb-1.5 leading-tight">{point.descricaoApoio}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mb-3 border-t border-slate-100 pt-1.5">
                  Ref: {point.referencia}
                </p>
                <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     onMarkerClick(point);
                   }}
                   className="text-[10px] font-black text-white bg-[#0F172A] px-3 py-2 rounded-xl w-full uppercase flex items-center justify-center gap-2 hover:bg-[#1E293B] transition-colors shadow-lg"
                >
                  Ver Ficha Completa
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* MAP OVERLAY LEGEND */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xl">
        <p className="text-[8px] font-black text-[#38BDF8] uppercase tracking-widest mb-1.5">Distribuição Territorial</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-[#38BDF8] rounded-full shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
            <span className="text-[9px] font-black text-slate-600 uppercase">Apoios Ativos</span>
          </div>
          <div className="w-px h-3 bg-slate-200" />
          <div className="text-[9px] font-bold text-slate-400 uppercase">
            {mapPoints.length} Equipes Mapeadas
          </div>
        </div>
      </div>
    </div>
  );
}
