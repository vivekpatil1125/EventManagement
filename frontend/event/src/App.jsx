import { BrowserRouter as Router } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import AppRoutes from "./routes/AppRoutes";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  return (
    <Router>
      <AppRoutes />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
    </Router>
  );
}