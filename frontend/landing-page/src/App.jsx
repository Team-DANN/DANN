import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Must stay last — catches every URL that has no matching route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}