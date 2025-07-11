import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import LoginWithGoogle from "./pages/LoginWithGoogle";
import UserForm from "./pages/userform/UserForm";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginWithGoogle />} />
        <Route path="/userform" element={<UserForm />} />
        {/* Add more routes here if needed */}
      </Routes>
    </Router>
  );
}

export default App;
