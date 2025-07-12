import React, { useState, useEffect, memo } from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";

const PhoneCallingUIComponent = () => {
  const [connected, setConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (connected) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [connected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleCallToggle = () => {
    setConnected(!connected);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleSpeakerToggle = () => {
    setIsSpeaker(!isSpeaker);
  };

  return (
    <div className="phone-container">
      <div className="phone-ui">
        {/* Header */}
        <div className="call-header">
          <div className="status-indicator">
            <span
              className={`status-dot ${connected ? "connected" : "ringing"}`}
            ></span>
            <span className="status-text">
              {connected ? "Connected" : "Calling..."}
            </span>
          </div>
          {connected && (
            <div className="call-duration">{formatDuration(callDuration)}</div>
          )}
        </div>

        {/* Contact Info */}
        <div className="contact-info">
          <div className="avatar">
            <div className="avatar-image">🌾</div>
            <div className={`pulse-ring ${!connected ? "active" : ""}`}></div>
          </div>
          <h2 className="contact-name">Agriguru Assistant</h2>
          <p className="contact-subtitle">Smart Farming Support</p>
        </div>

        {/* Call Controls */}
        <div className="call-controls">
          <button
            className={`control-btn ${isMuted ? "active" : ""}`}
            onClick={handleMuteToggle}
            disabled={!connected}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button
            className={`control-btn speaker-btn ${isSpeaker ? "active" : ""}`}
            onClick={handleSpeakerToggle}
            disabled={!connected}
          >
            {isSpeaker ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          <button
            className={`call-btn ${connected ? "end-call" : "answer-call"}`}
            onClick={handleCallToggle}
          >
            {connected ? <PhoneOff size={24} /> : <Phone size={24} />}
          </button>
        </div>
      </div>

      <style>{`
        .phone-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
        }

        .phone-ui {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 32px 24px;
          width: 100%;
          max-width: 380px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .call-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .status-dot.connected {
          background: #10b981;
        }

        .status-dot.ringing {
          background: #f59e0b;
        }

        .status-text {
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
        }

        .call-duration {
          font-size: 14px;
          font-weight: 600;
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          padding: 4px 12px;
          border-radius: 12px;
        }

        .contact-info {
          text-align: center;
          margin-bottom: 48px;
        }

        .avatar {
          position: relative;
          margin: 0 auto 24px;
          width: 120px;
          height: 120px;
        }

        .avatar-image {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          position: relative;
          z-index: 2;
        }

        .pulse-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 120px;
          height: 120px;
          border: 3px solid #10b981;
          border-radius: 50%;
          opacity: 0;
          z-index: 1;
        }

        .pulse-ring.active {
          animation: pulse-ring 2s infinite;
        }

        .contact-name {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px 0;
        }

        .contact-subtitle {
          font-size: 16px;
          color: #6b7280;
          margin: 0;
        }

        .call-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 24px;
          margin-bottom: 32px;
        }

        .control-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          background: #f3f4f6;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .control-btn:hover:not(:disabled) {
          background: #e5e7eb;
          transform: scale(1.05);
        }

        .control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .control-btn.active {
          background: #dc2626;
          color: white;
        }

        .speaker-btn.active {
          background: #2563eb;
          color: white;
        }

        .call-btn {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .call-btn.answer-call {
          background: #10b981;
          color: white;
        }

        .call-btn.end-call {
          background: #dc2626;
          color: white;
        }

        .call-btn:hover {
          transform: scale(1.05);
        }

        .features-section {
          text-align: center;
        }

        .features-section h3 {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 16px 0;
        }

        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .feature-item {
          background: rgba(16, 185, 129, 0.1);
          padding: 12px 8px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          color: #065f46;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes pulse-ring {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0;
          }
        }

        @media (max-width: 480px) {
          .phone-container {
            padding: 16px;
          }

          .phone-ui {
            padding: 24px 20px;
          }

          .avatar-image {
            width: 100px;
            height: 100px;
            font-size: 40px;
          }

          .pulse-ring {
            width: 100px;
            height: 100px;
          }
        }
      `}</style>
    </div>
  );
};

export const PhoneCallingUI = memo(PhoneCallingUIComponent);
