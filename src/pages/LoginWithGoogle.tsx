import React from "react";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { FcGoogle } from "react-icons/fc"; // Google icon
import { auth } from "../firebase/Config"; // Import your Firebase config

const LoginWithGoogle: React.FC = () => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("Logged in user:", user);
      // Redirect or update UI as needed
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Logo and Welcome Text */}
        <div className="flex flex-col items-center mb-6">
          {/* Replace src with your logo path */}
          <img src="/logo.png" alt="Logo" className="h-16 mb-3" />
          <h1 className="text-xl font-light text-gray-300">Welcome to</h1>
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-semibold mb-6 text-center">Sign in</h2>

        {/* Google Button */}
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 px-4 rounded-xl hover:bg-gray-200 transition duration-300"
        >
          <FcGoogle className="text-xl" />
          <span className="font-medium">Continue with Google</span>
        </button>
      </div>
    </div>
  );
};

export default LoginWithGoogle;
