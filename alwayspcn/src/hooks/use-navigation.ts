"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** [lat, lng] – matches Leaflet's LatLng convention. */
export type NavPosition = [number, number];

export interface NavigationState {
  navMode: boolean;
  navPosition: NavPosition | null;
  /** Degrees clockwise from true north (0–360). */
  navHeading: number | null;
  navError: string | null;
  startNavigation: () => Promise<void>;
  stopNavigation: () => void;
}

export function useNavigation(): NavigationState {
  const [navMode, setNavMode] = useState(false);
  const [navPosition, setNavPosition] = useState<NavPosition | null>(null);
  const [navHeading, setNavHeading] = useState<number | null>(null);
  const [navError, setNavError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  // Track whether absolute orientation listener is attached so we can remove it.
  const absoluteAttachedRef = useRef(false);
  const relativeAttachedRef = useRef(false);

  // GPS-provided heading used as fallback when device orientation isn't available.
  const gpsHeadingRef = useRef<number | null>(null);
  // Track whether we received any device orientation events.
  const receivedOrientationRef = useRef(false);

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    receivedOrientationRef.current = true;
    // iOS: webkitCompassHeading is degrees clockwise from true north.
    const ext = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
    if (ext.webkitCompassHeading !== undefined && ext.webkitCompassHeading !== null) {
      setNavHeading(ext.webkitCompassHeading);
    } else if (e.alpha !== null) {
      // Standard alpha: degrees counterclockwise from magnetic north → convert to clockwise.
      setNavHeading((360 - e.alpha) % 360);
    }
  }, []);

  const stopNavigation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (absoluteAttachedRef.current) {
      window.removeEventListener(
        "deviceorientationabsolute",
        handleOrientation as EventListener,
        true,
      );
      absoluteAttachedRef.current = false;
    }
    if (relativeAttachedRef.current) {
      window.removeEventListener(
        "deviceorientation",
        handleOrientation as EventListener,
        true,
      );
      relativeAttachedRef.current = false;
    }
    gpsHeadingRef.current = null;
    receivedOrientationRef.current = false;
    setNavMode(false);
    setNavHeading(null);
  }, [handleOrientation]);

  const startNavigation = useCallback(async () => {
    setNavError(null);

    if (!navigator.geolocation) {
      setNavError("Geolocation is not supported by your browser.");
      return;
    }

    // iOS 13+ requires explicit permission for DeviceOrientationEvent.
    type DOEWithPerm = typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    const DOE = DeviceOrientationEvent as DOEWithPerm;
    if (typeof DOE.requestPermission === "function") {
      try {
        const result = await DOE.requestPermission();
        if (result !== "granted") {
          setNavError("Device orientation permission denied. Heading may use GPS direction.");
        }
      } catch {
        setNavError("Could not request orientation permission. Heading will use GPS direction when moving.");
      }
    }

    // Start continuous GPS tracking.
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setNavPosition([pos.coords.latitude, pos.coords.longitude]);
        // Use GPS heading as fallback if no device orientation events received.
        if (
          !receivedOrientationRef.current &&
          pos.coords.heading !== null &&
          !Number.isNaN(pos.coords.heading)
        ) {
          gpsHeadingRef.current = pos.coords.heading;
          setNavHeading(pos.coords.heading);
        }
      },
      (err) => {
        setNavError(`GPS error: ${err.message}`);
        stopNavigation();
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );

    // Attach orientation listeners.
    window.addEventListener(
      "deviceorientationabsolute",
      handleOrientation as EventListener,
      true,
    );
    absoluteAttachedRef.current = true;

    window.addEventListener(
      "deviceorientation",
      handleOrientation as EventListener,
      true,
    );
    relativeAttachedRef.current = true;

    setNavMode(true);
  }, [handleOrientation, stopNavigation]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      stopNavigation();
    };
  }, [stopNavigation]);

  return { navMode, navPosition, navHeading, navError, startNavigation, stopNavigation };
}
