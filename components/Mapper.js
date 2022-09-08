import React, { useState } from 'react';
import Map from 'react-map-gl';

function Mapper() {
    // const [viewport, setViewport] = useState({
    //     width:'100%',
    //     height:'100%',
    //     longitude: -122.4,
    //     latitude: 37.8,
    //     zoom:14
    // });

  return ( <Map
  initialViewState={{
    width:'100%',
    height:'100%',
    longitude: -100,
    latitude: 40,
    zoom: 3.5
  }}
  mapStyle="mapbox://styles/aliu5454/cl7mjumdb005v14qpkry6c8zw"
  mapboxApiAccessToken={process.env.mapbox_key}
//   {...viewport}
  />
  );
}

export default Mapper