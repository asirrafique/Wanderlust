document.addEventListener("DOMContentLoaded", () => {
  const token = window.mapToken || "";
  const listing = window.listing;
  const mapContainer = document.getElementById("map");

  if (!mapContainer) return;

  const showError = (message) => {
    mapContainer.innerHTML = `<div style="padding:1rem;color:#555;background:#f8f9fa;border:1px solid #ddd;border-radius:0.5rem;">${message}</div>`;
  };

  if (!token) {
    showError("Map could not load because the Mapbox token is missing.");
    console.error("Mapbox token is missing.");
    return;
  }

  if (!window.mapboxgl) {
    showError("Mapbox SDK did not load correctly.");
    console.error("Mapbox SDK is not available.");
    return;
  }

  if (!listing || !listing.geometry || !Array.isArray(listing.geometry.coordinates) || listing.geometry.coordinates.length !== 2) {
    showError("Map location data is unavailable for this listing.");
    console.error("Invalid listing geometry:", listing);
    return;
  }

  const coords = listing.geometry.coordinates;
  if (coords[0] === 0 && coords[1] === 0) {
    showError("Map location is not precise for this listing yet.");
    console.error("Listing coordinates are fallback 0,0.");
    return;
  }

  try {
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v12",
      center: coords,
      zoom: 9,
    });

    new mapboxgl.Marker({ color: "red" })
      .setLngLat(coords)
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<h4>${listing.title}</h4><p>Exact location may be approximate.</p>`
        )
      )
      .addTo(map);
  } catch (error) {
    showError("Unable to initialize the map right now.");
    console.error("Map initialization error:", error);
  }
});
  