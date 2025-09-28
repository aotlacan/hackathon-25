// src/main.jsx
import React, { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import Header from "./header.jsx";
import MyMap from "./map.jsx";
import Rooms from "./Rooms.jsx";

function Root() {
  const [selectedBrn, setSelectedBrn] = useState("1005092");

  return (
    <StrictMode>
      <div id="layout">
        {/* Top header */}
        <header id="MBathroomHeader">
          <Header />
        </header>

        {/* Two-column content: map left, sidebar right */}
        <div id="content">
          <div id="map-section">
            <MyMap onSelectBuilding={(brn) => setSelectedBrn(brn)} />
          </div>

          <aside id="sidebar">
            <h2 style={{ marginTop: 0 }}>Rooms</h2>
            <Rooms brn={selectedBrn} />
          </aside>
        </div>
      </div>
    </StrictMode>
  );
}

createRoot(document.getElementById("root")).render(<Root />);