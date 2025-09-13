const express = require("express");
const app = express();
const PORT = 5000;

app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Delivery Tracking</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
<style>
body { font-family: Arial; margin:0; padding:0; background:#f0f2f5; display:flex; justify-content:center; align-items:center; height:100vh;}
#map-container { width:85%; height:85%; border-radius:15px; overflow:hidden; box-shadow:0 6px 15px rgba(0,0,0,0.2); background:white; display:flex; flex-direction:column; }
#map { flex:1; width:100%; height:100%; }
#info { padding:10px; background:white; border-top:1px solid #ddd; display:flex; justify-content:space-between; font-weight:bold; align-items:center; }
button { padding:8px 15px; background:#007bff; color:white; border:none; border-radius:6px; cursor:pointer; font-size:15px; }
button:hover { background:#0056b3; }
</style>
</head>
<body>
<div id="map-container">
<div id="map"></div>
<div id="info">
<button onclick="startRoute()">🚴 Start Route</button>
<div id="distance">Distance Left: -</div>
<div id="time">Time Left: -</div>
</div>
</div>

<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script>
let map = L.map("map"); 
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution:"&copy; OpenStreetMap contributors" }).addTo(map);

let driverMarker = null;
let routeLine, traveledLine;
let routeCoords = [], traveledCoords = [];
let routeIndex = 0, routeDistance = 0, routeDuration = 0;

let currentStart = null; // ✅ will store your live position

// ✅ Destination Addis Ababa (city center coords, adjust if needed)
const end = [9.03, 38.74]; 

// ✅ Detect location on page load
navigator.geolocation.getCurrentPosition((pos) => {
  currentStart = [pos.coords.latitude, pos.coords.longitude];
  map.setView(currentStart, 14);
  L.marker(currentStart).addTo(map).bindPopup("You are here 📍").openPopup();
}, (err) => {
  alert("Error getting location: " + err.message + "\\nUsing Addis Ababa as fallback.");
  currentStart = [9.0108,38.7613];
  map.setView(currentStart, 14);
  L.marker(currentStart).addTo(map).bindPopup("Fallback Start").openPopup();
});

function startRoute() {
  if (!currentStart) {
    alert("Still fetching your location. Please try again.");
    return;
  }

  // Show destination
  L.marker(end).addTo(map).bindPopup("Destination: Addis Ababa");

  fetch(\`https://router.project-osrm.org/route/v1/driving/\${currentStart[1]},\${currentStart[0]};\${end[1]},\${end[0]}?overview=full&geometries=geojson\`)
    .then(res => res.json())
    .then(data => {
      routeCoords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      routeDistance = data.routes[0].distance / 1000;
      routeDuration = data.routes[0].duration;

      if (routeLine) map.removeLayer(routeLine);
      if (traveledLine) map.removeLayer(traveledLine);

      routeLine = L.polyline(routeCoords, { color:"blue", weight:4 }).addTo(map);
      traveledLine = L.polyline([], { color:"green", weight:5 }).addTo(map);

      map.fitBounds(routeLine.getBounds());

      if (!driverMarker) {
        const bikeIcon = L.icon({
          iconUrl:"https://cdn-icons-png.flaticon.com/512/854/854894.png",
          iconSize:[40,40],
          iconAnchor:[20,20],
        });
        driverMarker = L.marker(currentStart, { icon: bikeIcon }).addTo(map);
      }

      routeIndex = 0;
      traveledCoords = [];
      updateInfo();

      if (window.moveInterval) clearInterval(window.moveInterval);
      window.moveInterval = setInterval(moveDriver, 2000);
    });
}

function moveDriver() {
  if (routeIndex >= routeCoords.length) return;
  const [lat,lng] = routeCoords[routeIndex];
  driverMarker.setLatLng([lat,lng]);

  traveledCoords.push([lat,lng]);
  traveledLine.setLatLngs(traveledCoords);

  routeIndex++;
  updateInfo();

  if (routeIndex >= routeCoords.length) {
    driverMarker.bindPopup("Arrived at Destination 🚩").openPopup();
    clearInterval(window.moveInterval);
  }
}

function updateInfo() {
  let progress = routeIndex / routeCoords.length;
  let distLeft = (routeDistance * (1 - progress)).toFixed(2);
  let timeLeft = Math.round(routeDuration * (1 - progress) / 60);
  document.getElementById("distance").innerText = "Distance Left: " + distLeft + " km";
  document.getElementById("time").innerText = "Time Left: " + timeLeft + " min";
}
</script>
</body>
</html>`);
});

app.listen(PORT,()=>console.log("Server running at http://localhost:"+PORT));
