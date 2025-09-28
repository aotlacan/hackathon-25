import React, {useState} from "react";
import Rooms from "./Rooms.jsx";
import MyMap from "./map.jsx"

export default function App() {

  const [selectedBrn, setSelectedBrn] = useState("1005092");

  console.log(selectedBrn)
  return (
    <main style={{ padding: 16 }}>
      <h1>Flushfinder</h1>
      <MyMap onSelectBuilding={(brn) => {setSelectedBrn(brn); console.log(brn)}} />
      <Rooms brn={selectedBrn} />
    </main>
  );
}