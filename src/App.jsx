// import React from "react";
// import TVChart from "./TVChart";
// import { Toaster } from 'sonner';

// function App() {
//   return (
//     <div style={{ height: "100vh", width: "100vw" }}>
//       <Toaster richColors position="top-center" />
//       <TVChart />
//     </div>
//   );
// }

// export default App;


import React from "react";
import TVChart from "./TVChart";
import RenkoChart from "./RenkoChart"; // ✅ add this
import { Toaster } from "sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // ✅ add this

function App() {
  return (
    <BrowserRouter>
      <div style={{ height: "100vh", width: "100vw" }}>
        <Toaster richColors position="top-center" />

        <Routes>
          {/* Main Chart */}
          <Route path="/" element={<TVChart />} />

          {/* Renko Chart (new window route) */}
          <Route path="/renko-chart" element={<RenkoChart />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;