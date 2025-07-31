require(["esri/Map", "esri/layers/GeoJSONLayer", "esri/views/MapView","esri/layers/GraphicsLayer","esri/geometry/geometryEngine","esri/geometry/support/webMercatorUtils",
"esri/Graphic","esri/widgets/Home"], (
  Map,
  GeoJSONLayer,
  MapView,
  GraphicsLayer,
  geometryEngine,
  webMercatorUtils,
  Graphic,
  Home
) => {
  // If GeoJSON files are not on the same domain as your website, a CORS enabled server
  // or a proxy is required.
  const url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson";

  // Paste the url into a browser's address bar to download and view the attributes
  // in the GeoJSON file. These attributes include:
  // * mag - magnitude
  // * type - earthquake or other event such as nuclear test
  // * place - location of the event
  // * time - the time of the event
  // Use the Arcade Date() function to format time field into a human-readable format

  const template = {
    title: "Earthquake Info",
    content: "Magnitude {mag} {type} hit {place} on {time}",
    fieldInfos: [
      {
        fieldName: 'time',
        format: {
          dateFormat: 'short-date-short-time'
        }
      }
    ]
  };

  const renderer = {
    type: "simple",
    field: "mag",
    symbol: {
      type: "simple-marker",
      color: "orange",
      outline: {
        color: "white"
      }
    },
    visualVariables: [{
      type: "size",
      field: "mag",
      stops: [{
          value: 2.5,
          size: "2px"
        },
        {
          value: 8,
          size: "6px"
        }
      ]
    }]
  };
  const geojsonLayer = new GeoJSONLayer({
    url: url,
    copyright: "USGS Earthquakes",
    popupTemplate: template,
    //renderer: renderer,
    orderBy: {
      field: "mag"
    }
  });

  const bufferLayer = new GraphicsLayer();
  
  const map = new Map({
    basemap: "gray-vector",
    layers: [geojsonLayer, bufferLayer]
  });

  const view = new MapView({
    container: "viewDiv",
    center: [-168, 46],
    zoom: 2,
    map: map
  });

  const homeWidget = new Home({
      view: view
  });

  // 2. Add it to the map view
  view.ui.add(homeWidget, "top-left");

  let bufferActive = false;

  document.getElementById("bufferBtn").addEventListener("click", () => {
    const bufferBtn = document.getElementById("bufferBtn");

    if (!bufferActive) {
      // Add buffer
      geojsonLayer.queryFeatures({
        where: "1=1",
        returnGeometry: true,
        outFields: []
      }).then((results) => {
        const geometries = results.features.map(f => f.geometry);
        const projected = geometries.map(geom =>
          webMercatorUtils.geographicToWebMercator(geom)
        );
        const buffered = geometryEngine.buffer(projected, 5000, "meters");

        bufferLayer.removeAll();

        buffered.forEach(geometry => {
          const bufferGraphic = new Graphic({
            geometry: geometry,
            symbol: {
              type: "simple-fill",
              color: [0, 0, 255, 0.2],
              outline: { color: [0, 0, 255], width: 1 }
            }
          });
          bufferLayer.add(bufferGraphic);
        });

        bufferActive = true;
        bufferBtn.textContent = "Clear Buffer";
      });
    } else {
      // Remove buffer
      bufferLayer.removeAll();
      bufferActive = false;
      bufferBtn.textContent = "Buffer (5 km)";
    }
  });

      //export
   document.getElementById("exportBtn").addEventListener("click", () => {
      geojsonLayer.queryFeatures({
        where: "1=1",
        returnGeometry: true,
        outFields: ["*"]
      }).then((results) => {
        const geojson = {
          type: "FeatureCollection",
          features: results.features.map(f => {
            return {
              type: "Feature",
              geometry: f.geometry.toJSON(), // ArcGIS format
              properties: f.attributes
            };
          })
        };

        // Convert ArcGIS JSON to standard GeoJSON geometry format
        geojson.features = geojson.features.map(feature => {
          const geom = feature.geometry;
          let geoJSONGeom;

          if (geom.x !== undefined && geom.y !== undefined) {
            geoJSONGeom = {
              type: "Point",
              coordinates: [geom.x, geom.y]
            };
          } else {
            // Optionally handle other geometry types like Polygon, LineString
            geoJSONGeom = null;
          }

          return {
            type: "Feature",
            geometry: geoJSONGeom,
            properties: feature.properties
          };
        });

        // Trigger download
        const blob = new Blob([JSON.stringify(geojson, null, 2)], {
          type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Earthquakes.geojson";
        a.click();
        URL.revokeObjectURL(url);
      });
    });
});   
