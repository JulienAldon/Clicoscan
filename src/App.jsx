// import "./App.css";
import Sessions from "./pages/Sessions";
import Session from "./pages/Session";
import Login from "./pages/Login";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/auth";
import AppHeader from "./components/AppHeader";
import { ToastProvider } from './context/toast';
import Toast from "./components/ToastList";

function App() {

  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppHeader/>
          <Routes>
            <Route index element={<Login />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="session/:id" element={<Session />} />
          </Routes>
          <Toast 
							position="top-right"
          />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
