import { BrowserRouter as Router } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./context/AuthContext"; // Import the AuthProvider
import AppRoutes from "./routes/AppRoutes";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      </AuthProvider>
    </Router>
  );
}