import "./App.css";
import Sessions from "./pages/Sessions";
import Session from "./pages/Session";
import Login from "./pages/Login";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from 'react';

function App() {

  return (
      <BrowserRouter>
        <Routes>
          <Route index element={<Login />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="session/:id" element={<Session />} />
        </Routes>
      </BrowserRouter>
  );
}

export default App;
