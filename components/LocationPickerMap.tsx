import React, { useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

interface LocationPickerMapProps {
  value: { lat: number; lng: number } | null;
  defaultCenter: { lat: number; lng: number };
  onChange: (lat: number, lng: number) => void;
  height?: number;
}

// Same Leaflet + OpenStreetMap approach as the web app's LocationPicker — deliberately, rather
// than react-native-maps, which needs a Google Maps API key configured for Android before tiles
// will even render there. This needs no API key on either platform and behaves identically to
// web, at the cost of running inside a WebView instead of a native map view.
function buildHtml(center: { lat: number; lng: number }, marker: { lat: number; lng: number } | null): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false }).setView([${center.lat}, ${center.lng}], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    let marker = ${marker ? `L.marker([${marker.lat}, ${marker.lng}], { draggable: true }).addTo(map)` : 'null'};

    function post(lat, lng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng }));
    }

    function placeMarker(lat, lng) {
      if (marker) {
        marker.setLatLng([lat, lng]);
      } else {
        marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          post(pos.lat, pos.lng);
        });
      }
      post(lat, lng);
    }

    if (marker) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        post(pos.lat, pos.lng);
      });
    }

    map.on('click', (e) => placeMarker(e.latlng.lat, e.latlng.lng));

    // Bridge for the "use my current location" native button — see LocationPickerMap's
    // injectJavaScript call below.
    window.setPickedLocation = function(lat, lng) {
      placeMarker(lat, lng);
      map.setView([lat, lng], 15);
    };
  </script>
</body>
</html>`;
}

export function LocationPickerMap({ value, defaultCenter, onChange, height = 260 }: LocationPickerMapProps) {
  const webviewRef = useRef<WebView>(null);
  const html = buildHtml(value ?? defaultCenter, value);

  return (
    <View style={{ height, borderRadius: 12, overflow: 'hidden' }}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={(event) => {
          try {
            const { lat, lng } = JSON.parse(event.nativeEvent.data);
            onChange(lat, lng);
          } catch {
            // ignore malformed bridge messages
          }
        }}
      />
    </View>
  );
}
