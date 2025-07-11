import { useRef, useState, useEffect } from "react";
import "../App.scss";
import { LiveAPIProvider } from "../contexts/LiveAPIContext";
import SidePanel from "../components/side-panel/SidePanel";
import ControlTray from "../components/control-tray/ControlTray";
import cn from "classnames";
import { ElderlyAIAssistant } from "../components/elderlyassistant/ElderlyAssistant";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/Config"; // your firebase config

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (typeof API_KEY !== "string") {
  throw new Error("set REACT_APP_GEMINI_API_KEY in .env");
}

const host = "generativelanguage.googleapis.com";
const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

const Home = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  const [userUID, setUserUID] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // ✅ Logged in
        console.log("User is logged in hehe:", user.uid);
        setUserUID(user.uid);
      } else {
        // ❌ Logged out
        console.log("User is not logged in");
        setUserUID(null);
      }
    });

    return () => unsubscribe(); // clean up listener on unmount
  }, []);

  return (
    <LiveAPIProvider url={uri} apiKey={API_KEY}>
      <div className="streaming-console">
        <SidePanel />
        <main>
          <div className="main-app-area">
            <ElderlyAIAssistant currentUserId={userUID || ""} />

            <video
              className={cn("stream", {
                hidden: !videoRef.current || !videoStream,
              })}
              ref={videoRef}
              autoPlay
              playsInline
            />
          </div>

          <ControlTray
            videoRef={videoRef}
            supportsVideo={true}
            onVideoStreamChange={setVideoStream}
          >
            {/* Additional Buttons can go here */}
          </ControlTray>
        </main>
      </div>
    </LiveAPIProvider>
  );
};

export default Home;
