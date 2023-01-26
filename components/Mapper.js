import React, { useState } from 'react';
import Map, { Marker , Popup } from 'react-map-gl';
import getCenter from "geolib/es/getCenter"
import "mapbox-gl/dist/mapbox-gl.css"
import { MapPinIcon } from "@heroicons/react/solid";

function Mapper({ searchResults }) {
const [selectedLocation, setSelectedLocation] = useState({});

  // transform searchResults to { latitude: 52, longitude: 50, ...}
  const coordinates = searchResults.map(result => ({
    longitude: result.location.longitude,
    latitude: result.location.latitude,
  }));

  const center = getCenter(coordinates);

  const [viewport, setViewport] = useState({
    width: '100%',
    height: '100%',
    longitude: center.longitude,
    latitude: center.latitude,
    zoom: 10
  });

  return (<Map
    // mapStyle="mapbox://styles/aliu5454/cl7mjumdb005v14qpkry6c8zw"
    // light theme
    mapStyle="mapbox://styles/aliu5454/cl9btfi7a000k15t011719if6"
    mapboxAccessToken={process.env.mapbox_key}
    {...viewport}
    //onViewportChange={(viewport) => this.setState({viewport})}
    //onViewportChange={(nextViewport) => setViewport(nextViewport.viewport)}
    onMove={evt => setViewport(evt.viewport)}
  >
    {searchResults.map((result) => (
      <div key={result.location.longitude}>
        <Marker
          longitude={result.location.longitude}
          latitude={result.location.latitude}
          offsetLeft={-20}
          offsetTop={-10}
          anchor="center"
          >
            <p onClick={() => setSelectedLocation(result.location)} className="cursor-pointer text-2xl animate-bounce" aria-label="location-pin" role="img"> 
            {/* onMouseEnter={() => setSelectedLocation(result.location)} onMouseLeave={()=>setSelectedLocation({})}  */}
              📍
            </p>
          </Marker>

          {/* Popup that shows when we hover */}
          {selectedLocation.longitude === result.location.longitude && (
            // console.log(selectedLocation),
            <Popup
              longitude={result.location.longitude}
              latitude={result.location.latitude}
              // offsetLeft={-20}
              //offsetTop={100}
              onClose={() => setSelectedLocation({})}
              closeOnClick={false}
              className='border-rounded-2xl'
              >
                <div className='text-gray-700 font-bold'>
                  {result.name}
                </div>
            </Popup>)}
      </div>
    ))}
  </Map>
  );
}

export default Mapper