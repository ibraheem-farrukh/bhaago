import MapLibreGL from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { X, Minus, Plus, Locate, Maximize, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Theme detection
function getDocumentTheme() {
  if (typeof document === "undefined") return null;
  // Check for explicit dark class first
  if (document.documentElement.classList.contains("dark")) return "dark";
  // Check data-theme attribute
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  // If no dark class is present, assume light mode (App only toggles .dark)
  return "light";
}

function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useResolvedTheme(themeProp) {
  const [theme, setTheme] = useState(() => {
    if (themeProp) return themeProp;
    return getDocumentTheme() || getSystemTheme();
  });

  useEffect(() => {
    if (themeProp) { setTheme(themeProp); return; }

    const update = () => setTheme(getDocumentTheme() || getSystemTheme());

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", update);

    return () => {
      observer.disconnect();
      mql.removeEventListener("change", update);
    };
  }, [themeProp]);

  return theme;
}

// Context
const MapContext = createContext(null);

function getViewport(map) {
  const center = map.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

function useMap() {
  const context = useContext(MapContext);
  if (!context) throw new Error("useMap must be used within a Map component");
  return context;
}

const defaultStyles = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

// Default Loader
const DefaultLoader = () => (
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="flex gap-1">
      <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
      <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:150ms]" />
      <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:300ms]" />
    </div>
  </div>
);

// Map Component
const Map = forwardRef(function Map(
  { children, className, theme: themeProp, styles, projection, viewport, onViewportChange, ...props },
  ref
) {
  const containerRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const currentStyleRef = useRef(null);
  const styleTimeoutRef = useRef(null);
  const internalUpdateRef = useRef(false);
  const resolvedTheme = useResolvedTheme(themeProp);

  const isControlled = viewport !== undefined && onViewportChange !== undefined;
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const mapStyles = useMemo(() => ({
    dark: styles?.dark ?? defaultStyles.dark,
    light: styles?.light ?? defaultStyles.light,
  }), [styles]);

  useImperativeHandle(ref, () => mapInstance, [mapInstance]);

  const clearStyleTimeout = useCallback(() => {
    if (styleTimeoutRef.current) {
      clearTimeout(styleTimeoutRef.current);
      styleTimeoutRef.current = null;
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    const initialStyle = resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light;
    currentStyleRef.current = initialStyle;

    const map = new MapLibreGL.Map({
      container: containerRef.current,
      style: initialStyle,
      renderWorldCopies: false,
      attributionControl: { compact: true },
      ...props,
      ...viewport,
    });

    const styleDataHandler = () => {
      clearStyleTimeout();
      styleTimeoutRef.current = setTimeout(() => {
        setIsStyleLoaded(true);
        if (projection) map.setProjection(projection);
      }, 100);
    };
    const loadHandler = () => setIsLoaded(true);

    const handleMove = () => {
      if (internalUpdateRef.current) return;
      if (isControlled) onViewportChangeRef.current?.(getViewport(map));
    };

    map.on("styledata", styleDataHandler);
    map.on("load", loadHandler);
    map.on("moveend", handleMove);

    setMapInstance(map);

    return () => {
      clearStyleTimeout();
      map.off("styledata", styleDataHandler);
      map.off("load", loadHandler);
      map.off("moveend", handleMove);
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle controlled viewport changes
  useEffect(() => {
    if (!mapInstance || !isLoaded || !isControlled || !viewport) return;
    internalUpdateRef.current = true;
    mapInstance.jumpTo(viewport);
    requestAnimationFrame(() => { internalUpdateRef.current = false; });
  }, [mapInstance, isLoaded, isControlled, viewport]);

  // Theme switching
  useEffect(() => {
    if (!mapInstance || !isLoaded) return;
    const newStyle = resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light;
    if (currentStyleRef.current === newStyle) return;
    currentStyleRef.current = newStyle;
    setIsStyleLoaded(false);
    mapInstance.setStyle(newStyle);
  }, [mapInstance, isLoaded, resolvedTheme, mapStyles]);

  const contextValue = useMemo(
    () => ({ map: mapInstance, isLoaded: isLoaded && isStyleLoaded }),
    [mapInstance, isLoaded, isStyleLoaded]
  );

  return (
    <MapContext.Provider value={contextValue}>
      <div ref={containerRef} className={cn("relative w-full h-full", className)}>
        {!isLoaded && <DefaultLoader />}
        {mapInstance && children}
      </div>
    </MapContext.Provider>
  );
});

// Marker Context
const MarkerContext = createContext(null);

function useMarkerContext() {
  const context = useContext(MarkerContext);
  if (!context) throw new Error("Marker components must be used within MapMarker");
  return context;
}

// MapMarker
function MapMarker({
  longitude, latitude, children,
  onClick, onMouseEnter, onMouseLeave,
  onDragStart, onDrag, onDragEnd,
  draggable = false, ...markerOptions
}) {
  const { map } = useMap();
  const callbacksRef = useRef({ onClick, onMouseEnter, onMouseLeave, onDragStart, onDrag, onDragEnd });
  callbacksRef.current = { onClick, onMouseEnter, onMouseLeave, onDragStart, onDrag, onDragEnd };

  const marker = useMemo(() => {
    const m = new MapLibreGL.Marker({
      ...markerOptions,
      element: document.createElement("div"),
      draggable,
    }).setLngLat([longitude, latitude]);

    const handleClick = (e) => callbacksRef.current.onClick?.(e);
    const handleMouseEnter = (e) => callbacksRef.current.onMouseEnter?.(e);
    const handleMouseLeave = (e) => callbacksRef.current.onMouseLeave?.(e);

    m.getElement()?.addEventListener("click", handleClick);
    m.getElement()?.addEventListener("mouseenter", handleMouseEnter);
    m.getElement()?.addEventListener("mouseleave", handleMouseLeave);

    const handleDragStart = () => {
      const lngLat = m.getLngLat();
      callbacksRef.current.onDragStart?.({ lng: lngLat.lng, lat: lngLat.lat });
    };
    const handleDrag = () => {
      const lngLat = m.getLngLat();
      callbacksRef.current.onDrag?.({ lng: lngLat.lng, lat: lngLat.lat });
    };
    const handleDragEnd = () => {
      const lngLat = m.getLngLat();
      callbacksRef.current.onDragEnd?.({ lng: lngLat.lng, lat: lngLat.lat });
    };

    m.on("dragstart", handleDragStart);
    m.on("drag", handleDrag);
    m.on("dragend", handleDragEnd);

    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;
    marker.addTo(map);
    return () => { marker.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  if (marker.getLngLat().lng !== longitude || marker.getLngLat().lat !== latitude) {
    marker.setLngLat([longitude, latitude]);
  }
  if (marker.isDraggable() !== draggable) marker.setDraggable(draggable);

  const currentOffset = marker.getOffset();
  const newOffset = markerOptions.offset ?? [0, 0];
  const [newOffsetX, newOffsetY] = Array.isArray(newOffset) ? newOffset : [newOffset.x, newOffset.y];
  if (currentOffset.x !== newOffsetX || currentOffset.y !== newOffsetY) marker.setOffset(newOffset);
  if (marker.getRotation() !== markerOptions.rotation) marker.setRotation(markerOptions.rotation ?? 0);

  return (
    <MarkerContext.Provider value={{ marker, map }}>
      {children}
    </MarkerContext.Provider>
  );
}

// MarkerContent
function MarkerContent({ children, className }) {
  const { marker } = useMarkerContext();
  return createPortal(
    <div className={cn("relative cursor-pointer", className)}>
      {children || <DefaultMarkerIcon />}
    </div>,
    marker.getElement()
  );
}

function DefaultMarkerIcon() {
  return <div className="relative h-4 w-4 rounded-full border-2 border-white bg-primary shadow-lg" />;
}

// MarkerPopup
function MarkerPopup({ children, className, closeButton = false, ...popupOptions }) {
  const { marker, map } = useMarkerContext();
  const container = useMemo(() => document.createElement("div"), []);

  const popup = useMemo(() => {
    return new MapLibreGL.Popup({
      offset: 16,
      ...popupOptions,
      closeButton: false,
    }).setMaxWidth("none").setDOMContent(container);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;
    popup.setDOMContent(container);
    marker.setPopup(popup);
    return () => { marker.setPopup(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return createPortal(
    <div className={cn("p-3 text-popover-foreground text-sm", className)}>
      {closeButton && (
        <button
          className="absolute right-1.5 top-1.5 p-0.5 rounded-sm opacity-70 hover:opacity-100"
          onClick={() => popup.remove()}
        >
          <X className="size-3.5" />
        </button>
      )}
      {children}
    </div>,
    container
  );
}

// MarkerTooltip
function MarkerTooltip({ children, className, ...popupOptions }) {
  const { marker, map } = useMarkerContext();
  const container = useMemo(() => document.createElement("div"), []);

  const tooltip = useMemo(() => {
    return new MapLibreGL.Popup({
      offset: 16,
      ...popupOptions,
      closeOnClick: true,
      closeButton: false,
    }).setMaxWidth("none");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;
    tooltip.setDOMContent(container);

    const handleMouseEnter = () => tooltip.setLngLat(marker.getLngLat()).addTo(map);
    const handleMouseLeave = () => tooltip.remove();

    marker.getElement()?.addEventListener("mouseenter", handleMouseEnter);
    marker.getElement()?.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      marker.getElement()?.removeEventListener("mouseenter", handleMouseEnter);
      marker.getElement()?.removeEventListener("mouseleave", handleMouseLeave);
      tooltip.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return createPortal(
    <div className={cn("px-2.5 py-1.5 text-popover-foreground text-xs font-medium whitespace-nowrap", className)}>
      {children}
    </div>,
    container
  );
}

// MarkerLabel
function MarkerLabel({ children, className, position = "top" }) {
  const { marker } = useMarkerContext();
  return createPortal(
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 text-[10px] font-medium text-foreground bg-background/90 backdrop-blur-sm rounded border border-border/50",
        position === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
        className
      )}
    >
      {children}
    </div>,
    marker.getElement()
  );
}

// MapPopup (standalone)
function MapPopup({
  longitude, latitude, onClose, children, className,
  closeButton = false, ...popupOptions
}) {
  const { map, isLoaded } = useMap();
  const container = useMemo(() => document.createElement("div"), []);

  const popup = useMemo(() => {
    return new MapLibreGL.Popup({
      offset: 12,
      ...popupOptions,
      closeButton: false,
    }).setMaxWidth("none").setDOMContent(container);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoaded || !map) return;

    popup.setDOMContent(container);
    popup.setLngLat([longitude, latitude]).addTo(map);
    popup.on("close", () => onClose?.());

    return () => { popup.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  useEffect(() => {
    popup.setLngLat([longitude, latitude]);
  }, [longitude, latitude, popup]);

  return createPortal(
    <div className={cn("p-3 text-popover-foreground text-sm", className)}>
      {closeButton && (
        <button
          className="absolute right-1.5 top-1.5 p-0.5 rounded-sm opacity-70 hover:opacity-100"
          onClick={() => popup.remove()}
        >
          <X className="size-3.5" />
        </button>
      )}
      {children}
    </div>,
    container
  );
}

// MapControls
const positionClasses = {
  "top-left": "top-3 left-3",
  "top-right": "top-3 right-3",
  "bottom-left": "bottom-3 left-3",
  "bottom-right": "bottom-3 right-3",
};

function ControlGroup({ children }) {
  return (
    <div className="flex flex-col bg-card border border-border rounded-lg shadow-sm overflow-hidden divide-y divide-border">
      {children}
    </div>
  );
}

function ControlButton({ onClick, label, children, className }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex items-center justify-center w-8 h-8 text-foreground hover:bg-accent transition-colors cursor-pointer",
        className
      )}
    >
      {children}
    </button>
  );
}

function CompassButton({ onClick }) {
  const { map, isLoaded } = useMap();
  const [bearing, setBearing] = useState(0);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const update = () => setBearing(map.getBearing());
    map.on("rotate", update);
    return () => { map.off("rotate", update); };
  }, [map, isLoaded]);

  return (
    <ControlButton onClick={onClick} label="Reset bearing">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-4"
        style={{ transform: `rotate(${-bearing}deg)`, transition: "transform 200ms" }}
      >
        <path d="M12 3L8 14h8L12 3z" fill="currentColor" opacity={0.9} />
        <path d="M12 21l4-7H8l4 7z" fill="currentColor" opacity={0.3} />
      </svg>
    </ControlButton>
  );
}

function MapControls({
  position = "bottom-right",
  showZoom = true, showCompass = false,
  showLocate = false, showFullscreen = false,
  className, onLocate,
}) {
  const { map } = useMap();
  const [waitingForLocation, setWaitingForLocation] = useState(false);

  const handleZoomIn = useCallback(() => { map?.zoomTo(map.getZoom() + 1, { duration: 300 }); }, [map]);
  const handleZoomOut = useCallback(() => { map?.zoomTo(map.getZoom() - 1, { duration: 300 }); }, [map]);
  const handleResetBearing = useCallback(() => { map?.resetNorthPitch({ duration: 300 }); }, [map]);

  const handleLocate = useCallback(() => {
    setWaitingForLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { longitude: pos.coords.longitude, latitude: pos.coords.latitude };
          map?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 14, duration: 1500 });
          onLocate?.(coords);
          setWaitingForLocation(false);
        },
        () => setWaitingForLocation(false),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [map, onLocate]);

  const handleFullscreen = useCallback(() => {
    const container = map?.getContainer();
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, [map]);

  return (
    <div className={cn("absolute z-10 flex flex-col gap-1.5", positionClasses[position], className)}>
      {showZoom && (
        <ControlGroup>
          <ControlButton onClick={handleZoomIn} label="Zoom in"><Plus className="size-4" /></ControlButton>
          <ControlButton onClick={handleZoomOut} label="Zoom out"><Minus className="size-4" /></ControlButton>
        </ControlGroup>
      )}
      {showCompass && (
        <ControlGroup><CompassButton onClick={handleResetBearing} /></ControlGroup>
      )}
      {showLocate && (
        <ControlGroup>
          <ControlButton onClick={handleLocate} label="Find my location" className={waitingForLocation ? "animate-pulse" : ""}>
            {waitingForLocation ? <Loader2 className="size-4 animate-spin" /> : <Locate className="size-4" />}
          </ControlButton>
        </ControlGroup>
      )}
      {showFullscreen && (
        <ControlGroup>
          <ControlButton onClick={handleFullscreen} label="Toggle fullscreen"><Maximize className="size-4" /></ControlButton>
        </ControlGroup>
      )}
    </div>
  );
}

// MapRoute
function MapRoute({
  id: propId, coordinates,
  color = "#4285F4", width = 3, opacity = 0.8,
  dashArray, onClick, onMouseEnter, onMouseLeave,
  interactive = true,
}) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `route-source-${id}`;
  const layerId = `route-layer-${id}`;

  useEffect(() => {
    if (!isLoaded || !map) return;

    map.addSource(sourceId, {
      type: "geojson",
      data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
    });

    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": color,
        "line-width": width,
        "line-opacity": opacity,
        ...(dashArray && { "line-dasharray": dashArray }),
      },
    });

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  useEffect(() => {
    if (!isLoaded || !map || coordinates.length < 2) return;
    const source = map.getSource(sourceId);
    if (source) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates },
      });
    }
  }, [isLoaded, map, coordinates, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) return;
    map.setPaintProperty(layerId, "line-color", color);
    map.setPaintProperty(layerId, "line-width", width);
    map.setPaintProperty(layerId, "line-opacity", opacity);
    if (dashArray) map.setPaintProperty(layerId, "line-dasharray", dashArray);
  }, [isLoaded, map, layerId, color, width, opacity, dashArray]);

  useEffect(() => {
    if (!isLoaded || !map || !interactive) return;

    const handleClick = () => onClick?.();
    const handleMouseEnter = () => { map.getCanvas().style.cursor = "pointer"; onMouseEnter?.(); };
    const handleMouseLeave = () => { map.getCanvas().style.cursor = ""; onMouseLeave?.(); };

    map.on("click", layerId, handleClick);
    map.on("mouseenter", layerId, handleMouseEnter);
    map.on("mouseleave", layerId, handleMouseLeave);

    return () => {
      map.off("click", layerId, handleClick);
      map.off("mouseenter", layerId, handleMouseEnter);
      map.off("mouseleave", layerId, handleMouseLeave);
    };
  }, [isLoaded, map, layerId, onClick, onMouseEnter, onMouseLeave, interactive]);

  return null;
}

export {
  Map,
  useMap,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
  MarkerLabel,
  MapPopup,
  MapControls,
  MapRoute,
};
