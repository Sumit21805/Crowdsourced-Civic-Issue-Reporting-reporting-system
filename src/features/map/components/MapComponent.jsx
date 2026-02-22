import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { divIcon } from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlertTriangle, Trash2, Navigation, MapPin, Layout } from 'lucide-react';

// Coordinates for Delhi
const DEFAULT_CENTER = [28.6139, 77.2090];
const DEFAULT_ZOOM = 13;

const createCustomIcon = (icon, isSelected) => {
    const iconMarkup = renderToStaticMarkup(icon);
    return divIcon({
        html: `<div class="p-1 rounded-full shadow-lg border-2 transition-all duration-300 ${isSelected ? 'bg-white scale-125 border-blue-500 z-[1000] neural-pulse' : 'bg-white border-slate-200'}">${iconMarkup}</div>`,
        className: 'custom-leaflet-icon',
        iconSize: [isSelected ? 40 : 32, isSelected ? 40 : 32],
        iconAnchor: [isSelected ? 20 : 16, isSelected ? 40 : 32],
    });
};

const MapEvents = ({ onMapClick }) => {
    useMapEvents({
        click: (e) => {
            onMapClick(e.latlng);
        },
    });
    return null;
};

const RecenterMap = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] && center[1]) {
            map.flyTo(center, 14, { animate: true, duration: 1.5 });
        }
    }, [center, map]);
    return null;
};

const MapComponent = ({ routes = [], markers = [], onMapClick, onMarkerClick, selectedId, startCoord, endCoord, reportCoord, center }) => {
    const getIcon = (type, isSelected) => {
        const iconProps = { size: isSelected ? 24 : 20 };
        switch (type) {
            case 'pothole': return createCustomIcon(<AlertTriangle color="#ef4444" {...iconProps} />, isSelected);
            case 'garbage': return createCustomIcon(<Trash2 color="#eab308" {...iconProps} />, isSelected);
            case 'start': return createCustomIcon(<Navigation color="#22c55e" size={24} fill="#22c55e" />, false);
            case 'end': return createCustomIcon(<MapPin color="#ef4444" size={24} fill="#ef4444" />, false);
            case 'report': return createCustomIcon(<MapPin color="#eab308" size={24} fill="#eab308" />, false);
            default: return createCustomIcon(<AlertTriangle {...iconProps} />, isSelected);
        }
    };

    return (
        <div className="h-full w-full relative z-0">
            <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <RecenterMap center={center} />
                <MapEvents onMapClick={onMapClick} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {/* Start Marker */}
                {startCoord && startCoord[0] && startCoord[1] && (
                    <Marker position={startCoord} icon={getIcon('start', false)}>
                        <Tooltip permanent direction="top" offset={[0, -20]} className="bg-slate-900 border-none text-white font-bold p-1 px-2 rounded shadow-lg opacity-100">
                            Start
                        </Tooltip>
                    </Marker>
                )}

                {/* End Marker */}
                {endCoord && endCoord[0] && endCoord[1] && (
                    <Marker position={endCoord} icon={getIcon('end', false)}>
                        <Tooltip permanent direction="top" offset={[0, -20]} className="bg-slate-900 border-none text-white font-bold p-1 px-2 rounded shadow-lg opacity-100">
                            End
                        </Tooltip>
                    </Marker>
                )}

                {/* Live Selection Marker (Reporting) */}
                {reportCoord && reportCoord[0] && reportCoord[1] && (
                    <Marker position={reportCoord} icon={getIcon('report', false)}>
                        <Tooltip permanent direction="top" offset={[0, -20]} className="bg-slate-900 border-none text-white font-bold p-1 px-2 rounded shadow-lg opacity-100">
                            New Report
                        </Tooltip>
                    </Marker>
                )}

                {markers.filter(m => m.lat && m.lng).map(marker => (
                    <Marker
                        key={marker.id}
                        position={[marker.lat, marker.lng]}
                        icon={getIcon(marker.type, marker.id === selectedId)}
                        eventHandlers={{
                            click: () => onMarkerClick(marker)
                        }}
                    >
                    </Marker>
                ))}

                {routes.map((route, index) => (
                    <Polyline
                        key={index}
                        positions={route.points}
                        pathOptions={{
                            color: route.isRecommended ? '#22c55e' : '#3b82f6',
                            weight: route.isRecommended ? 6 : 4,
                            opacity: route.isRecommended ? 1 : 0.6,
                            dashArray: route.isRecommended ? '' : '10, 10'
                        }}
                    >
                        <Popup>
                            <div className="p-2">
                                <div className="font-bold text-slate-800">{route.type} Route</div>
                                <div className="text-xs text-slate-500">{(route.distance / 1000).toFixed(2)} km</div>
                                <div className={`mt-1 font-semibold ${route.dangerScore > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {route.dangerScore} Hazards
                                </div>
                            </div>
                        </Popup>
                    </Polyline>
                ))}
            </MapContainer>

            {/* Legend — desktop: bottom-right expanded. mobile: top-right mini pill */}
            <div className="hidden md:block absolute bottom-6 right-6 z-[1000] bg-slate-900/90 backdrop-blur p-4 rounded-lg border border-slate-700 shadow-xl text-white text-xs min-w-[150px]">
                <h4 className="font-bold mb-3 uppercase tracking-tighter text-slate-400">Legend</h4>
                <div className="space-y-2">
                    <div className="flex items-center gap-2"><AlertTriangle size={14} className="text-red-400" /><span>Potholes</span></div>
                    <div className="flex items-center gap-2"><Trash2 size={14} className="text-yellow-400" /><span>Garbage</span></div>
                    <hr className="border-slate-700 my-2" />
                    <div className="flex items-center gap-2"><div className="w-4 h-1 bg-green-500 rounded"></div><span>Safest Route</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-1 border-t-2 border-dashed border-blue-500"></div><span>Fastest Route</span></div>
                </div>
            </div>

            {/* Mobile Legend — compact pills at top-right, below status bar */}
            <div className="md:hidden absolute top-28 right-3 z-[1000] flex flex-col gap-1">
                <div className="bg-slate-900/80 backdrop-blur px-2 py-1 rounded-full border border-slate-700/50 flex items-center gap-1.5">
                    <AlertTriangle size={10} className="text-red-400" />
                    <span className="text-white text-[9px] font-bold">Pothole</span>
                </div>
                <div className="bg-slate-900/80 backdrop-blur px-2 py-1 rounded-full border border-slate-700/50 flex items-center gap-1.5">
                    <Trash2 size={10} className="text-yellow-400" />
                    <span className="text-white text-[9px] font-bold">Garbage</span>
                </div>
                <div className="bg-slate-900/80 backdrop-blur px-2 py-1 rounded-full border border-slate-700/50 flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-green-500 rounded"></div>
                    <span className="text-white text-[9px] font-bold">Safe</span>
                </div>
                <div className="bg-slate-900/80 backdrop-blur px-2 py-1 rounded-full border border-slate-700/50 flex items-center gap-1.5">
                    <div className="w-3 border-t border-dashed border-blue-500"></div>
                    <span className="text-white text-[9px] font-bold">Fast</span>
                </div>
            </div>
        </div>
    );
};

export default MapComponent;
