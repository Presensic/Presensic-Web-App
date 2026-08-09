import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  loadFaceModels,
  detectSingleFace,
  getEAR,
  getYawRatio,
  isSmiling,
  saveEnrollment,
  getCurrentLocation,
} from "../faceUtils";

type Step =
  | "loading"
  | "center"
  | "turn_left"
  | "turn_right"
  | "blink"
  | "smile"
  | "done"
  | "error";

interface Props {
  userId: string;
  onComplete?: () => void;
}

const EAR_CLOSED = 0.21;
const EAR_OPEN = 0.25;
const YAW_TURN_THRESHOLD = 0.35;

export default function FaceEnrollment({ userId, onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState<Step>("loading");
  const [message, setMessage] = useState("Loading face models...");
  const [blinkCount, setBlinkCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const eyesWereClosed = useRef(false);
  const centerDescriptor = useRef<Float32Array | null>(null);
  const rafId = useRef<number | null>(null);
  const isDestroyedRef = useRef<boolean>(false);

  useEffect(() => {
    isDestroyedRef.current = false;
    let stream: MediaStream | null = null;

    async function init() {
      try {
        await loadFaceModels();
        if (isDestroyedRef.current) return;
        
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        
        if (isDestroyedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playErr: any) {
            if (playErr.name !== "AbortError") {
              throw playErr;
            }
          }
        }
        
        if (isDestroyedRef.current) return;
        setStep("center");
        setMessage("Look straight at the camera");
      } catch (err: any) {
        if (isDestroyedRef.current) return;
        console.error("FaceEnrollment init error:", err);
        setErrorMsg(err?.message || "Could not access camera or models");
        setStep("error");
      }
    }

    init();

    return () => {
      isDestroyedRef.current = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const runLoop = useCallback(async () => {
    if (!videoRef.current || step === "done" || step === "error" || step === "loading") return;

    try {
      const result = await detectSingleFace(videoRef.current);

      if (result) {
        const { landmarks, descriptor, expressions } = result;
        const yaw = getYawRatio(landmarks);
        const ear = getEAR(landmarks);

        switch (step) {
          case "center":
            if (Math.abs(yaw) < 0.15) {
              centerDescriptor.current = descriptor;
              setStep("turn_left");
              setMessage("Slowly turn your head to the LEFT");
            }
            break;

          case "turn_left":
            if (yaw >= YAW_TURN_THRESHOLD) {
              setStep("turn_right");
              setMessage("Now slowly turn your head to the RIGHT");
            }
            break;

          case "turn_right":
            if (yaw <= -YAW_TURN_THRESHOLD) {
              setStep("blink");
              setMessage("Look straight ahead and blink twice");
            }
            break;

          case "blink":
            if (ear < EAR_CLOSED) {
              eyesWereClosed.current = true;
            } else if (ear > EAR_OPEN && eyesWereClosed.current) {
              eyesWereClosed.current = false;
              setBlinkCount((c) => {
                const next = c + 1;
                if (next >= 2) {
                  setStep("smile");
                  setMessage("Great! Now give a smile");
                }
                return next;
              });
            }
            break;

          case "smile":
            if (isSmiling(expressions)) {
              const loc = await getCurrentLocation().catch(() => ({
                lat: 0,
                lng: 0,
              }));
              const finalDescriptor = centerDescriptor.current || descriptor;
              saveEnrollment(userId, finalDescriptor, loc);
              setStep("done");
              setMessage("Face enrollment complete");
              onComplete?.();
            }
            break;
        }
      }
    } catch (err) {
      console.error("Detection error", err);
    }

    rafId.current = requestAnimationFrame(runLoop);
  }, [step, userId, onComplete]);

  useEffect(() => {
    rafId.current = requestAnimationFrame(runLoop);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [runLoop]);

  return (
    <div style={{ textAlign: "center", padding: 24 }}>
      {step === "error" ? (
        <div style={{ color: "#b91c1c", marginBottom: 16 }}>
          <p>Enrollment failed: {errorMsg}</p>
          <p>Check camera permissions and that model files are served from CDN.</p>
        </div>
      ) : (
        <>
          <h2 style={{ marginBottom: 8 }}>Face Enrollment</h2>
          <p style={{ marginBottom: 16, fontSize: 18 }}>{message}</p>
        </>
      )}
      <video
        ref={videoRef}
        muted
        playsInline
        style={{
          width: 480,
          maxWidth: "100%",
          borderRadius: 12,
          transform: "scaleX(-1)",
          background: "#000",
          display: step === "error" ? "none" : "block",
          margin: "0 auto",
        }}
      />
      {step === "blink" && <p>Blinks detected: {blinkCount} / 2</p>}
      {step === "done" && (
        <p style={{ color: "#16a34a", fontWeight: 600 }}>✓ Face and location saved</p>
      )}
    </div>
  );
}
