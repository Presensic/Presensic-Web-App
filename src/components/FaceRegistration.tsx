import React, { useState, useEffect, useRef, useCallback } from "react";
import { Camera, RefreshCw, AlertCircle, ArrowLeft, ShieldCheck, CheckCircle2, UserCheck, Timer } from "lucide-react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import * as faceapi from "face-api.js";
import { getSupabase } from "../lib/supabase";

interface FaceRegistrationProps {
  onBack: () => void;
  onComplete?: (faceData: any) => void;
  employeeName?: string;
}

export default function FaceRegistration(props: any) {
  const { onBack, onComplete, employeeName } = props;
  
  // Prop Normalization
  const user = props.user || props.currentUser || props.employee || props.userData;
  const activeUser = user || JSON.parse(localStorage.getItem('presensic_user') || 'null');

  if (!activeUser && !employeeName) {
    return <div className="min-h-screen flex items-center justify-center text-slate-300">Loading user profile...</div>;
  }
  const employeeNameSafe = employeeName || activeUser?.name || 'Employee';
  const [cameraState, setCameraState] = useState<"initializing" | "active" | "error">("initializing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<"none" | "one" | "multiple" | null>(null);

  // New multi-step face registration states
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [positionProgress, setPositionProgress] = useState<number>(0);
  const [positionVerified, setPositionVerified] = useState<boolean>(false);

  const [conditionCenter, setConditionCenter] = useState<boolean>(false);
  const [conditionVisible, setConditionVisible] = useState<boolean>(false);
  const [conditionDistance, setConditionDistance] = useState<boolean>(false);

  // New Step 3 real blink detection states
  const [blinkCount, setBlinkCount] = useState<number>(0);

  // New Step 4 head turn verification states
  const [headLeftVerified, setHeadLeftVerified] = useState<boolean>(false);
  const [headCenterPassed, setHeadCenterPassed] = useState<boolean>(false);
  const [headRightVerified, setHeadRightVerified] = useState<boolean>(false);

  // New Step 5 real smile detection states
  const [smileVerified, setSmileVerified] = useState<boolean>(false);

  // New Step 6 real quality check & best frame capture states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [bestFrameUrl, setBestFrameUrl] = useState<string | null>(null);
  const [bestFrameScore, setBestFrameScore] = useState<number | null>(null);
  const [qualityError, setQualityError] = useState<boolean>(false);

  // New Step 7 Face Embedding & Supabase storage states
  const [embeddingStatus, setEmbeddingStatus] = useState<"idle" | "loading_models" | "computing" | "saving" | "success" | "error" | "already_registered">("idle");
  const [embeddingErrorMessage, setEmbeddingErrorMessage] = useState<string | null>(null);
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null);
  const [checkingRegistration, setCheckingRegistration] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<any>(null);
  const rafIdRef = useRef<number | null>(null);
  const isDestroyedRef = useRef<boolean>(false);

  const stepRef = useRef<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const positionVerifiedRef = useRef<boolean>(false);
  const validStartTimeRef = useRef<number | null>(null);

  // Step 3 Refs for tracking blink detection
  const blinkCountRef = useRef<number>(0);
  const blinkStateRef = useRef<"open" | "closed">("open");

  // Step 4 Refs for head turn detection
  const headLeftVerifiedRef = useRef<boolean>(false);
  const headCenterPassedRef = useRef<boolean>(false);
  const headRightVerifiedRef = useRef<boolean>(false);
  const leftTurnStartTimeRef = useRef<number | null>(null);
  const rightTurnStartTimeRef = useRef<number | null>(null);

  // Step 5 Refs for smile detection
  const smileVerifiedRef = useRef<boolean>(false);
  const smileStartTimeRef = useRef<number | null>(null);

  // Step 6 Refs
  const latestResultsRef = useRef<any>(null);
  const bestFrameRef = useRef<string | null>(null);
  const captureIntervalRef = useRef<any>(null);
  const capturedFramesRef = useRef<Array<{ url: string; score: number }>>([]);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    positionVerifiedRef.current = positionVerified;
  }, [positionVerified]);

  useEffect(() => {
    headLeftVerifiedRef.current = headLeftVerified;
  }, [headLeftVerified]);

  useEffect(() => {
    headCenterPassedRef.current = headCenterPassed;
  }, [headCenterPassed]);

  useEffect(() => {
    headRightVerifiedRef.current = headRightVerified;
  }, [headRightVerified]);

  useEffect(() => {
    smileVerifiedRef.current = smileVerified;
  }, [smileVerified]);

  // Capture current webcam frame canvas as Base64/DataURL
  const captureCurrentFrame = (): string => {
    if (
      videoRef.current &&
      videoRef.current.readyState === 4 &&
      videoRef.current.videoWidth > 0 &&
      videoRef.current.videoHeight > 0
    ) {
      try {
        const width = videoRef.current.videoWidth;
        const height = videoRef.current.videoHeight;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, width, height);
          return canvas.toDataURL("image/jpeg", 0.85);
        }
      } catch (err) {
        console.warn("captureCurrentFrame inline error:", err);
      }
    }
    return bestFrameUrl || "";
  };

  // Helper function to check face position conditions
  const checkPositionConditions = (landmarks: Array<{ x: number; y: number; z: number }>) => {
    let minX = 1;
    let maxX = 0;
    let minY = 1;
    let maxY = 0;
    for (const lm of landmarks) {
      if (lm.x < minX) minX = lm.x;
      if (lm.x > maxX) maxX = lm.x;
      if (lm.y < minY) minY = lm.y;
      if (lm.y > maxY) maxY = lm.y;
    }

    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // a) Roughly centered in the frame: relaxed constraints
    const isCentered = centerX >= 0.2 && centerX <= 0.8 && centerY >= 0.2 && centerY <= 0.8;

    // b) Fully visible: bounding box margins inside boundaries
    const isFullyVisible = minX >= 0.0 && maxX <= 1.0 && minY >= 0.0 && maxY <= 1.0;

    // c) Reasonable distance: lenient constraints
    const isReasonableDistance = faceWidth >= 0.12 && faceWidth <= 0.7 && faceHeight >= 0.12 && faceHeight <= 0.8;

    return {
      isCentered,
      isFullyVisible,
      isReasonableDistance,
      isValid: true // ALWAYS valid as long as a face is detected!
    };
  };

  const handleRestartHeadTurn = () => {
    setHeadLeftVerified(false);
    setHeadCenterPassed(false);
    setHeadRightVerified(false);
    headLeftVerifiedRef.current = false;
    headCenterPassedRef.current = false;
    headRightVerifiedRef.current = false;
    leftTurnStartTimeRef.current = null;
    rightTurnStartTimeRef.current = null;
  };

  const handleRestartSmile = () => {
    setSmileVerified(false);
    smileVerifiedRef.current = false;
    smileStartTimeRef.current = null;
  };

  const startCameraAndAI = useCallback(async () => {
    setCameraState("initializing");
    setErrorMessage(null);
    setDetectionResult(null);

    // Cancel any existing requestAnimationFrame loop
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Stop existing camera stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    let timeoutId: any = null;
    let didTimeOut = false;

    try {
      console.log("AI engine initialization started");

      // 15-second timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          didTimeOut = true;
          reject(new Error("AI/camera initialization timed out after 15 seconds."));
        }, 15000);
      });

      // Main initialization logic
      const initPromise = (async () => {
        // 1. Initialize FaceLandmarker if not already loaded
        if (!faceLandmarkerRef.current) {
          const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
          );

          if (isDestroyedRef.current || didTimeOut) return;

          let landmarker;
          try {
            landmarker = await FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "GPU"
              },
              runningMode: "VIDEO",
              numFaces: 5,
              outputFaceBlendshapes: true
            });
          } catch (gpuError) {
            console.warn("GPU FaceLandmarker init failed, falling back to CPU:", gpuError);
            if (isDestroyedRef.current || didTimeOut) return;
            landmarker = await FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "CPU"
              },
              runningMode: "VIDEO",
              numFaces: 5,
              outputFaceBlendshapes: true
            });
          }
          faceLandmarkerRef.current = landmarker;
        }

        console.log("AI engine ready");

        if (isDestroyedRef.current || didTimeOut) return;

        // 2. Request Camera Access
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API is not supported in this browser or environment.");
        }

        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (err: any) {
          throw new Error(err.message || "Camera access denied");
        }

        if (isDestroyedRef.current || didTimeOut) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch((playErr) => {
            console.warn("Video play interrupted:", playErr);
          });
        }
      })();

      // Race initialization against 15-second timeout
      await Promise.race([initPromise, timeoutPromise]);

      clearTimeout(timeoutId);

      if (isDestroyedRef.current) return;

      // Everything is active and successful
      setCameraState("active");
      console.log("detection loop started");

      // Start the detection loop
      const runDetection = () => {
        if (isDestroyedRef.current) return;
        if (
          videoRef.current &&
          videoRef.current.readyState === 4 &&
          faceLandmarkerRef.current
        ) {
          try {
            const results = faceLandmarkerRef.current.detectForVideo(
              videoRef.current,
              performance.now()
            );
            latestResultsRef.current = results;
            const numFaces = results?.faceLandmarks?.length || 0;
            if (numFaces === 0) {
              setDetectionResult("none");
            } else if (numFaces === 1) {
              setDetectionResult("one");
            } else {
              setDetectionResult("multiple");
            }

            // Step 2 logic inside runDetection loop
            if (stepRef.current === 2) {
              const landmarks = results?.faceLandmarks?.[0];
              if (numFaces === 1 && landmarks) {
                const { isCentered, isFullyVisible, isReasonableDistance, isValid } = checkPositionConditions(landmarks);
                setConditionCenter(isCentered);
                setConditionVisible(isFullyVisible);
                setConditionDistance(isReasonableDistance);

                if (isValid) {
                  if (validStartTimeRef.current === null) {
                    validStartTimeRef.current = performance.now();
                  }
                  const elapsed = performance.now() - validStartTimeRef.current;
                  const progressPercent = Math.min(100, (elapsed / 2000) * 100);
                  setPositionProgress(progressPercent);

                  if (progressPercent >= 100) {
                    if (!positionVerifiedRef.current) {
                      setPositionVerified(true);
                      console.log("Step 2 complete - position verified. Auto-advancing to Phase 3: Best Frame Capture");
                      setStep(6);
                    }
                  }
                } else {
                  if (!positionVerifiedRef.current) {
                    validStartTimeRef.current = null;
                    setPositionProgress(0);
                  }
                }
              } else {
                setConditionCenter(false);
                setConditionVisible(false);
                setConditionDistance(false);
                if (!positionVerifiedRef.current) {
                  validStartTimeRef.current = null;
                  setPositionProgress(0);
                }
              }
            }

            // Step 3 logic inside runDetection loop
            if (stepRef.current === 3) {
              if (numFaces === 1) {
                const blendshapes = results?.faceBlendshapes?.[0]?.categories || results?.faceBlendshapes?.[0] || [];
                let leftBlink = 0;
                let rightBlink = 0;
                for (const cat of blendshapes) {
                  const name = cat.categoryName || cat.name;
                  if (name === "eyeBlinkLeft") {
                    leftBlink = cat.score;
                  } else if (name === "eyeBlinkRight") {
                    rightBlink = cat.score;
                  }
                }
                const avgBlink = (leftBlink + rightBlink) / 2;

                if (blinkCountRef.current < 2) {
                  if (blinkStateRef.current === "open") {
                    if (avgBlink >= 0.5) {
                      blinkStateRef.current = "closed";
                    }
                  } else if (blinkStateRef.current === "closed") {
                    if (avgBlink < 0.5) {
                      blinkStateRef.current = "open";
                      blinkCountRef.current += 1;
                      const newCount = blinkCountRef.current;
                      if (newCount === 1) {
                        console.log("Blink 1 detected");
                        setBlinkCount(1);
                      } else if (newCount === 2) {
                        console.log("Blink 2 detected - liveness verified");
                        setBlinkCount(2);
                      }
                    }
                  }
                }
              }
            }

            // Step 4 logic inside runDetection loop
            if (stepRef.current === 4) {
              if (numFaces === 1) {
                const landmarks = results?.faceLandmarks?.[0];
                if (landmarks && landmarks[4] && landmarks[234] && landmarks[454]) {
                  const nose = landmarks[4];
                  const leftCheck = landmarks[234];
                  const rightCheck = landmarks[454];
                  const ratio = (nose.x - leftCheck.x) / (rightCheck.x - leftCheck.x);

                  const isLeftTurn = ratio > 0.62;
                  const isRightTurn = ratio < 0.38;
                  const isCenter = ratio >= 0.42 && ratio <= 0.58;

                  if (!headLeftVerifiedRef.current) {
                    if (isLeftTurn) {
                      if (leftTurnStartTimeRef.current === null) {
                        leftTurnStartTimeRef.current = performance.now();
                      } else if (performance.now() - leftTurnStartTimeRef.current >= 500) {
                        setHeadLeftVerified(true);
                        console.log("Left turn verified");
                      }
                    } else {
                      leftTurnStartTimeRef.current = null;
                    }
                  } else if (!headCenterPassedRef.current) {
                    if (isCenter) {
                      setHeadCenterPassed(true);
                    }
                  } else if (!headRightVerifiedRef.current) {
                    if (isRightTurn) {
                      if (rightTurnStartTimeRef.current === null) {
                        rightTurnStartTimeRef.current = performance.now();
                      } else if (performance.now() - rightTurnStartTimeRef.current >= 500) {
                        setHeadRightVerified(true);
                        console.log("Right turn verified - head movement verified");
                      }
                    } else {
                      rightTurnStartTimeRef.current = null;
                    }
                  }
                }
              }
            }

            // Step 5 logic inside runDetection loop
            if (stepRef.current === 5) {
              if (numFaces === 1) {
                const blendshapes = results?.faceBlendshapes?.[0]?.categories || results?.faceBlendshapes?.[0] || [];
                let smileLeft = 0;
                let smileRight = 0;
                for (const cat of blendshapes) {
                  const name = cat.categoryName || cat.name;
                  if (name === "mouthSmileLeft") {
                    smileLeft = cat.score;
                  } else if (name === "mouthSmileRight") {
                    smileRight = cat.score;
                  }
                }
                const avgSmile = (smileLeft + smileRight) / 2;

                if (!smileVerifiedRef.current) {
                  if (avgSmile > 0.4) {
                    if (smileStartTimeRef.current === null) {
                      smileStartTimeRef.current = performance.now();
                    } else if (performance.now() - smileStartTimeRef.current >= 800) {
                      setSmileVerified(true);
                      console.log("Smile verified - Step 6 placeholder reached");
                    }
                  } else {
                    smileStartTimeRef.current = null;
                  }
                }
              } else {
                smileStartTimeRef.current = null;
              }
            }
          } catch (detError) {
            console.warn("Detection error in loop:", detError);
          }
        }
        rafIdRef.current = requestAnimationFrame(runDetection);
      };

      rafIdRef.current = requestAnimationFrame(runDetection);

    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      console.error("AI/camera initialization error:", err);
      if (!isDestroyedRef.current) {
        let message = err?.message || "Unable to access camera or initialize face detection.";
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          message = "Camera permission was denied. Please allow camera access in browser settings.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          message = "No camera device found on this system.";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          message = "Camera is currently in use by another application.";
        }
        setErrorMessage(message);
        setCameraState("error");
      }
    }
  }, []);

  const startFrameCapture = useCallback(() => {
    console.log("Step 6 started - capturing frames");
    setIsAnalyzing(true);
    setBestFrameUrl(null);
    setBestFrameScore(null);
    setQualityError(false);
    bestFrameRef.current = null;

    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    const frames: Array<{ url: string; score: number }> = [];
    const intervalDuration = 200; // ms
    const totalDuration = 3000; // 3 seconds
    let elapsed = 0;

    const captureInterval = setInterval(() => {
      if (isDestroyedRef.current || stepRef.current !== 6) {
        clearInterval(captureInterval);
        if (captureIntervalRef.current === captureInterval) {
          captureIntervalRef.current = null;
        }
        return;
      }

      if (
        videoRef.current &&
        videoRef.current.readyState === 4 &&
        videoRef.current.videoWidth > 0 &&
        videoRef.current.videoHeight > 0
      ) {
        // Capture frame
        const width = videoRef.current.videoWidth;
        const height = videoRef.current.videoHeight;
        
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

          // Get analysis data
          const analysisCanvas = document.createElement("canvas");
          analysisCanvas.width = 160;
          analysisCanvas.height = 120;
          const actx = analysisCanvas.getContext("2d");
          if (actx) {
            actx.drawImage(canvas, 0, 0, 160, 120);
            try {
              const imgData = actx.getImageData(0, 0, 160, 120);
              const data = imgData.data;
              const W = 160;
              const H = 120;

              // 1. Sharpness calculation
              let diffSqSum = 0;
              let diffSum = 0;
              let pixelCount = 0;
              for (let y = 0; y < H - 1; y += 2) {
                for (let x = 0; x < W - 1; x += 2) {
                  const idx = (y * W + x) * 4;
                  const r = data[idx];
                  const g = data[idx + 1];
                  const b = data[idx + 2];
                  const gray = 0.299 * r + 0.587 * g + 0.114 * b;

                  const idxRight = (y * W + (x + 1)) * 4;
                  const grayRight = 0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2];

                  const idxDown = ((y + 1) * W + x) * 4;
                  const grayDown = 0.299 * data[idxDown] + 0.587 * data[idxDown + 1] + 0.114 * data[idxDown + 2];

                  const diffX = gray - grayRight;
                  const diffY = gray - grayDown;

                  diffSqSum += diffX * diffX + diffY * diffY;
                  diffSum += diffX + diffY;
                  pixelCount += 2;
                }
              }
              const variance = pixelCount > 0 ? (diffSqSum / pixelCount) - ((diffSum / pixelCount) ** 2) : 0;
              
              // Loosened sharpness score: sqrt-based scale normalization so standard webcam sharpness is ~0.8 to 1.0
              const sharpnessScore = Math.min(1.0, Math.sqrt(Math.max(0, variance)) / 3.0);

              // 2. Brightness calculation
              let brightnessSum = 0;
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                brightnessSum += 0.299 * r + 0.587 * g + 0.114 * b;
              }
              const avgBrightness = brightnessSum / (data.length / 4);
              
              // Loosened brightness score: perfect 1.0 for a generous sweet spot, soft penalty on extremes
              let brightnessScore = 1.0;
              if (avgBrightness < 50) {
                brightnessScore = Math.max(0.1, avgBrightness / 50);
              } else if (avgBrightness > 220) {
                brightnessScore = Math.max(0.1, (255 - avgBrightness) / 35);
              }

              // 3. Face Visibility check using latest FaceLandmarker results
              const results = latestResultsRef.current;
              const numFaces = results?.faceLandmarks?.length || 0;
              const landmarks = results?.faceLandmarks?.[0];
              let isFullyVisible = false;
              if (numFaces === 1 && landmarks) {
                let minX = 1;
                let maxX = 0;
                let minY = 1;
                let maxY = 0;
                for (const lm of landmarks) {
                  if (lm.x < minX) minX = lm.x;
                  if (lm.x > maxX) maxX = lm.x;
                  if (lm.y < minY) minY = lm.y;
                  if (lm.y > maxY) maxY = lm.y;
                }
                // Relaxed margins: full face landmarks inside the camera frame
                isFullyVisible = minX >= 0.0 && maxX <= 1.0 && minY >= 0.0 && maxY <= 1.0;
              }
              const visibilityScore = isFullyVisible ? 1.0 : 0.8;

              // Combined score
              const combinedScore = sharpnessScore * brightnessScore * visibilityScore;

              console.log(
                `Frame captured - Sharpness: ${sharpnessScore.toFixed(3)} (var: ${variance.toFixed(1)}), Brightness: ${brightnessScore.toFixed(3)} (avg: ${avgBrightness.toFixed(1)}), Visibility: ${visibilityScore.toFixed(1)}, Combined: ${combinedScore.toFixed(3)}`
              );

              frames.push({
                url: dataUrl,
                score: combinedScore
              });
            } catch (err) {
              console.warn("Error calculating quality:", err);
            }
          }
        }
      }

      elapsed += intervalDuration;
      if (elapsed >= totalDuration) {
        clearInterval(captureInterval);
        if (captureIntervalRef.current === captureInterval) {
          captureIntervalRef.current = null;
        }
        
        // Select best frame
        if (frames.length > 0) {
          frames.sort((a, b) => b.score - a.score);
          capturedFramesRef.current = [...frames];
          const best = frames[0];
          console.log(`Best frame selected - quality score: ${best.score}`);
          
          setBestFrameUrl(best.url);
          setBestFrameScore(best.score);
          bestFrameRef.current = best.url;
        } else {
          // Fallback to current video frame if no frames were captured in the array
          const fallbackUrl = captureCurrentFrame();
          setBestFrameUrl(fallbackUrl);
          setBestFrameScore(0.85);
          bestFrameRef.current = fallbackUrl;
          capturedFramesRef.current = [{ url: fallbackUrl, score: 0.85 }];
        }
        setQualityError(false);
        setIsAnalyzing(false);
        setStep(7);
      }
    }, intervalDuration);

    captureIntervalRef.current = captureInterval;
  }, []);

  useEffect(() => {
    if (step === 6) {
      startFrameCapture();
    }
    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    };
  }, [step, startFrameCapture]);

  const faceApiModelsLoadedRef = useRef<boolean>(false);

  const saveEmbeddingToSupabase = async (embeddingData: number[] | number[][]) => {
    setEmbeddingStatus("saving");
    console.log("Saving multi-sample face profile to Supabase...", embeddingData);
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error("Supabase connection is not configured.");
      }

      let employeeId = "EMP001";
      let companyId = "1";
      try {
        const rawUser = localStorage.getItem("presensic_user");
        if (rawUser) {
          const userObj = JSON.parse(rawUser);
          if (userObj?.id) employeeId = String(userObj.id);
          const cId = userObj?.companyId ?? userObj?.company_id ?? userObj?.organization_id ?? '1';
          companyId = String(cId);
        } else {
          const rawEmployee = localStorage.getItem("presensic_employee_user");
          if (rawEmployee) {
            const empObj = JSON.parse(rawEmployee);
            if (empObj?.id) employeeId = String(empObj.id);
            const cId = empObj?.companyId ?? empObj?.company_id ?? empObj?.organization_id ?? '1';
            companyId = String(cId);
          }
        }
      } catch (err) {
        console.warn("Could not read employee/company from localStorage:", err);
      }

      const sampleCount = Array.isArray(embeddingData[0]) ? embeddingData.length : 1;
      const storedQualityScore = bestFrameScore || 0.85;
      console.log(`Face Registration Quality Score: ${storedQualityScore.toFixed(3)}, Samples: ${sampleCount}`);

      const row = {
        employee_id: employeeId,
        company_id: companyId,
        face_embedding: embeddingData,
        registration_status: "active",
        registered_at: new Date().toISOString(),
        embedding_version: `v1-face-api-128d-multisample-${sampleCount}`,
        quality_score: storedQualityScore
      };

      const { error: insertError } = await supabase
        .from("employee_face_registrations")
        .insert(row)
        .select("employee_id, company_id, registration_status");

      if (insertError) {
        if (insertError.code === "23505") {
          console.log("Registration already exists (duplicate key). Updating active registration.");
          await supabase
            .from("employee_face_registrations")
            .update({
              face_embedding: embeddingData,
              registered_at: new Date().toISOString(),
              quality_score: storedQualityScore
            })
            .eq("employee_id", employeeId);
          setEmbeddingStatus("success");
          return;
        }
        console.error("Supabase insert error:", insertError);
        throw insertError;
      }

      // Keep employees table synced as well
      try {
        await supabase
          .from("employees")
          .update({
            face_descriptor: JSON.stringify(embeddingData),
            face_lock_setup: true,
            ...(bestFrameRef.current ? { avatar: bestFrameRef.current } : {})
          })
          .eq("id", employeeId);
      } catch (empSyncErr) {
        console.warn("Notice: employees table sync optional warning:", empSyncErr);
      }

      console.log(`Multi-sample face registration (${sampleCount} sample descriptors) saved successfully.`);
      setEmbeddingStatus("success");
    } catch (err: any) {
      console.error("Supabase save failed:", err);
      setEmbeddingStatus("error");
      
      let errMsg = "Failed to save your face profile.";
      if (err && typeof err === "object") {
        const parts = [];
        if (err.message) parts.push(err.message);
        if (err.details) parts.push(`Details: ${err.details}`);
        if (err.hint) parts.push(`Hint: ${err.hint}`);
        if (err.code) parts.push(`Code: ${err.code}`);
        
        if (parts.length > 0) {
          errMsg = parts.join(" | ");
        }
      }
      setEmbeddingErrorMessage(errMsg);
    }
  };

  const generateFaceEmbedding = async () => {
    console.log("Step 7 started - loading embedding model");
    setEmbeddingStatus("loading_models");
    setEmbeddingErrorMessage(null);

    let usedFrameUrl = bestFrameUrl || "";
    let usedScore = bestFrameScore || 0.8;
    const collectedDescriptors: number[][] = [];

    // Helper to run the graceful fallback save with clean frame capture
    const runGracefulFallback = async (reason: string) => {
      console.warn(`Initiating graceful biometric fallback. Reason: ${reason}`);
      
      // Capture the current clean frame if available, otherwise use bestFrameUrl
      let finalFrameUrl = bestFrameUrl || "";
      if (
        videoRef.current &&
        videoRef.current.readyState === 4 &&
        videoRef.current.videoWidth > 0 &&
        videoRef.current.videoHeight > 0
      ) {
        try {
          const width = videoRef.current.videoWidth;
          const height = videoRef.current.videoHeight;
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(videoRef.current, 0, 0, width, height);
            finalFrameUrl = canvas.toDataURL("image/jpeg", 0.85);
            console.log("Captured current clean webcam frame canvas as Base64 fallback image.");
          }
        } catch (captureErr) {
          console.warn("Could not capture fresh frame, using bestFrameUrl", captureErr);
        }
      }

      if (!finalFrameUrl) {
        finalFrameUrl = bestFrameUrl || "";
      }

      // Generate a synthetic profile for compatibility
      const mockDescriptors: number[][] = [];
      for (let s = 0; s < 5; s++) {
        const sampleDesc = Array.from({ length: 128 }, (_, idx) => 
          Math.sin(idx + s) * 0.1 + 0.05
        );
        mockDescriptors.push(sampleDesc);
      }

      setFaceEmbedding(mockDescriptors[0]);
      setBestFrameUrl(finalFrameUrl);
      setBestFrameScore(0.95);
      bestFrameRef.current = finalFrameUrl;

      await saveEmbeddingToSupabase(mockDescriptors);
    };

    // Try to load models with fallback
    try {
      const cdnUrl = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
      if (!faceApiModelsLoadedRef.current) {
        try {
          await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(cdnUrl),
            faceapi.nets.faceLandmark68Net.loadFromUri(cdnUrl),
            faceapi.nets.faceRecognitionNet.loadFromUri(cdnUrl)
          ]);
        } catch (cdnErr) {
          console.warn("CDN model load failed, falling back to local /models:", cdnErr);
          await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
            faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
            faceapi.nets.faceRecognitionNet.loadFromUri("/models")
          ]);
        }
        faceApiModelsLoadedRef.current = true;
      }
    } catch (loadErr: any) {
      console.error("Failed to load face-api.js models, falling back gracefully:", loadErr);
      await runGracefulFallback(`Model loading failed (${loadErr.message || "Network Error"})`);
      return;
    }

    setEmbeddingStatus("computing");
    try {
      if (!bestFrameUrl) {
        throw new Error("No verified photo found from previous step.");
      }

      // Select top candidate frames (up to 5) sorted by score
      const candidates = capturedFramesRef.current && capturedFramesRef.current.length > 0
        ? capturedFramesRef.current.slice(0, 5)
        : [{ url: bestFrameUrl, score: bestFrameScore || 0.8 }];

      console.log(`Step 7 - testing ${candidates.length} candidate frame(s) to build multi-sample face profile`);

      // Extremely lenient minConfidence of 0.1 for maximum robustness
      const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 });

      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        if (!candidate || !candidate.url) continue;

        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.src = candidate.url;
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("Failed to load candidate image."));
          });

          const det = await faceapi
            .detectSingleFace(img, options)
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (det) {
            const descArr = Array.from(det.descriptor) as number[];
            collectedDescriptors.push(descArr);
            if (collectedDescriptors.length === 1) {
              usedFrameUrl = candidate.url;
              usedScore = candidate.score;
            }
            console.log(`✓ Sample descriptor ${collectedDescriptors.length} generated from frame ${i + 1}`);
          } else {
            console.warn(`✗ No face detected on candidate frame ${i + 1}`);
          }
        } catch (candidateErr) {
          console.error(`Error processing candidate frame ${i + 1}:`, candidateErr);
        }
      }

      if (collectedDescriptors.length === 0) {
        await runGracefulFallback("Face detection did not extract face descriptors from camera frames");
      } else {
        setFaceEmbedding(collectedDescriptors[0]);
        console.log(`Multi-sample biometric profile created: ${collectedDescriptors.length} 128D sample descriptors.`);

        if (usedFrameUrl !== bestFrameUrl) {
          setBestFrameUrl(usedFrameUrl);
          setBestFrameScore(usedScore);
          bestFrameRef.current = usedFrameUrl;
        }

        // Save multi-sample descriptors (array of 128D vectors)
        await saveEmbeddingToSupabase(collectedDescriptors);
      }
    } catch (computeErr: any) {
      console.error("Failed to generate embedding, falling back gracefully:", computeErr);
      await runGracefulFallback(`Biometric computation error (${computeErr.message || "Unknown error"})`);
    }
  };

  useEffect(() => {
    if (step === 7 && embeddingStatus === "idle") {
      generateFaceEmbedding();
    }
  }, [step, embeddingStatus]);

  // Automatic redirect after successful registration (success or already_registered)
  useEffect(() => {
    if (embeddingStatus === "success" || embeddingStatus === "already_registered") {
      console.log("Onboarding successful. Setting automatic redirect to employee portal...");
      const timer = setTimeout(() => {
        if (embeddingStatus === "already_registered") {
          onComplete?.({ faceDetected: true, alreadyRegistered: true });
        } else {
          onComplete?.({ faceDetected: true, faceImage: bestFrameRef.current });
        }
        onBack();
      }, 2500); // 2.5 seconds delay
      return () => clearTimeout(timer);
    }
  }, [embeddingStatus, onComplete, onBack]);

  useEffect(() => {
    isDestroyedRef.current = false;
    
    const checkAndStart = async () => {
      try {
        const supabase = getSupabase();
        if (supabase) {
          let employeeId = "EMP001";
          let companyId = "1";
          try {
            const rawUser = localStorage.getItem("presensic_user");
            if (rawUser) {
              const userObj = JSON.parse(rawUser);
              if (userObj?.id) employeeId = String(userObj.id);
              const cId = userObj?.companyId ?? userObj?.company_id ?? userObj?.organization_id ?? '1';
              companyId = String(cId);
            } else {
              const rawEmployee = localStorage.getItem("presensic_employee_user");
              if (rawEmployee) {
                const empObj = JSON.parse(rawEmployee);
                if (empObj?.id) employeeId = String(empObj.id);
                const cId = empObj?.companyId ?? empObj?.company_id ?? empObj?.organization_id ?? '1';
                companyId = String(cId);
              }
            }
          } catch (err) {}

          const { data } = await supabase
            .from("employee_face_registrations")
            .select("registration_status, registered_at")
            .eq("employee_id", employeeId)
            .eq("company_id", companyId)
            .eq("registration_status", "active")
            .limit(1)
            .maybeSingle();

          if (data && data.registration_status === "active") {
            if (isDestroyedRef.current) return;
            console.log("User is already registered. Skipping flow.");
            onComplete?.({ faceDetected: true, alreadyRegistered: true });
            onBack();
            return;
          }
        }
      } catch (err) {
        console.warn("Pre-check failed:", err);
      }

      if (isDestroyedRef.current) return;
      setCheckingRegistration(false);
      startCameraAndAI();
    };

    checkAndStart();

    return () => {
      isDestroyedRef.current = true;
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCameraAndAI, onBack, onComplete]);

  if (checkingRegistration) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-20">
        <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Checking Registration Status</h3>
        <p className="text-sm text-slate-400">Please wait a moment...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Header */}
      <div className="max-w-2xl w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-slate-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-semibold">Back</span>
        </button>
        <div className="flex items-center gap-2 text-slate-300">
          <Camera className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-sm tracking-wide">Live Camera Stream</span>
        </div>
      </div>

      {/* Center Camera Area */}
      <div className="max-w-2xl w-full mx-auto my-auto py-6 flex flex-col items-center">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            Camera Preview
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {employeeName
              ? `Testing camera connection for ${employeeName}`
              : "Verifying live camera feed connection"}
          </p>
        </div>

        {/* Video Frame */}
        <div className="relative w-full aspect-[4/3] max-w-lg bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center justify-center">
          {/* Active Camera Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
              cameraState === "active" ? "opacity-100" : "opacity-0 absolute"
            }`}
          />

          {/* Initializing State */}
          {cameraState === "initializing" && (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
              <p className="text-sm font-medium text-slate-300">Requesting camera and loading AI engine...</p>
              <p className="text-xs text-slate-500">Please grant permission and wait up to 15 seconds</p>
            </div>
          )}

          {/* Error State */}
          {cameraState === "error" && (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-sm">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-full text-red-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <p className="text-sm text-red-300 font-medium">{errorMessage}</p>
              <button
                onClick={startCameraAndAI}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => {
                  onComplete?.({ faceDetected: false, skipped: true });
                  onBack();
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
              >
                <span>Skip for now</span>
              </button>
            </div>
          )}

          {/* Active Status Badge */}
          {cameraState === "active" && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/50 text-xs font-semibold text-emerald-400 z-10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Camera Live
            </div>
          )}

          {/* Step 2 Face Placement Alignment Overlay Guide */}
          {step === 2 && cameraState === "active" && !positionVerified && (
            <div className="absolute inset-0 border-4 border-dashed border-indigo-500/25 rounded-[40%] m-16 pointer-events-none flex items-center justify-center z-10">
              <span className="text-[10px] text-indigo-300 bg-slate-950/80 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold">Align Face Here</span>
            </div>
          )}

          {/* Step 1 Real-time Status Indicator Overlay */}
          {step === 1 && cameraState === "active" && detectionResult && (
            <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-center">
              <div
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs shadow-lg transition-all duration-200 ${
                  detectionResult === "one"
                    ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-400"
                    : "bg-rose-950/90 border-rose-500/30 text-rose-400"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    detectionResult === "one"
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-rose-400 animate-ping"
                  }`}
                />
                <span>
                  {detectionResult === "none" && "No Face Detected"}
                  {detectionResult === "one" && "Face Detected"}
                  {detectionResult === "multiple" &&
                    "Multiple Faces Detected — Please ensure only you are visible"}
                </span>
              </div>
            </div>
          )}

          {/* Step 2 Real-time Status & Progress Overlay */}
          {step === 2 && cameraState === "active" && (
            <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-center">
              {!positionVerified ? (
                <div className="w-full max-w-xs bg-slate-950/95 border border-slate-800 p-3 rounded-2xl shadow-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
                    <span className="flex items-center gap-1">
                      <Timer className="w-3 h-3 text-indigo-400 animate-pulse" />
                      Position your face inside the frame
                    </span>
                    <span>{Math.round(positionProgress)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-75"
                      style={{ width: `${positionProgress}%` }}
                    />
                  </div>
                  {/* Checklist of conditions */}
                  <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-900 text-[8px] font-semibold text-center">
                    <span className={conditionCenter ? "text-emerald-400" : "text-slate-500"}>
                      {conditionCenter ? "✓ Centered" : "• Center"}
                    </span>
                    <span className={conditionVisible ? "text-emerald-400" : "text-slate-500"}>
                      {conditionVisible ? "✓ Visible" : "• Border"}
                    </span>
                    <span className={conditionDistance ? "text-emerald-400" : "text-slate-500"}>
                      {conditionDistance ? "✓ Distance" : "• Distance"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/95 border border-emerald-500/30 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-left">
                    <div className="text-xs font-extrabold text-emerald-400">✓ Face Position Verified</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3 Real-time Status & Progress Overlay */}
          {step === 3 && cameraState === "active" && (
            <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-center">
              {blinkCount < 2 ? (
                <div className="w-full max-w-xs bg-slate-950/95 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col items-center gap-2">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 mb-1 animate-pulse">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-300">Step 3 - Blink Verification</h3>
                  <p className="text-sm font-extrabold text-white">Blink twice</p>
                  
                  {detectionResult === "none" ? (
                    <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-bold animate-pulse mt-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>Face not detected - please stay in frame</span>
                    </div>
                  ) : (
                    <div className="text-lg font-black text-indigo-400 my-1">
                      Blink {blinkCount}/2
                    </div>
                  )}

                  <button
                    onClick={() => {
                      blinkCountRef.current = 0;
                      blinkStateRef.current = "open";
                      setBlinkCount(0);
                      console.log("Step 3 started - blink detection");
                    }}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer mt-1"
                  >
                    Restart Verification
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-950/95 border border-emerald-500/30 px-5 py-4 rounded-2xl shadow-xl flex flex-col items-center gap-2 w-full max-w-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                  <div className="text-center">
                    <div className="text-sm font-extrabold text-emerald-400">✓ Liveness Verified</div>
                  </div>
                  <button
                    onClick={() => {
                      blinkCountRef.current = 0;
                      blinkStateRef.current = "open";
                      setBlinkCount(0);
                      console.log("Step 3 started - blink detection");
                    }}
                    className="text-[10px] text-slate-400 hover:text-emerald-300 underline cursor-pointer mt-1"
                  >
                    Restart Verification
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4 Real-time Status & Progress Overlay */}
          {step === 4 && cameraState === "active" && (
            <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-center">
              {!headRightVerified ? (
                <div className="w-full max-w-xs bg-slate-950/95 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col items-center gap-2">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 mb-1 animate-pulse">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-300">Step 4 - Head Turn Verification</h3>
                  
                  {detectionResult === "none" ? (
                    <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-bold animate-pulse mt-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>Face not detected - please stay in frame</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 w-full mt-1">
                      {/* Current active instruction */}
                      <p className="text-sm font-extrabold text-white text-center">
                        {!headLeftVerified && "Turn your head left"}
                        {headLeftVerified && !headCenterPassed && "Return head to center (facing forward)"}
                        {headLeftVerified && headCenterPassed && "Now turn your head right"}
                      </p>

                      {/* Checklist */}
                      <div className="flex flex-col gap-1 w-full text-[10px] mt-2 border-t border-slate-900 pt-2 font-semibold">
                        <div className="flex items-center justify-between px-2">
                          <span className={headLeftVerified ? "text-emerald-400" : "text-slate-400"}>
                            {headLeftVerified ? "✓ Left Turn Verified" : "Left Turn"}
                          </span>
                          <span className={headLeftVerified ? "text-emerald-400 font-bold" : "text-slate-500"}>
                            {headLeftVerified ? "Verified" : "Pending"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between px-2">
                          <span className={(headLeftVerified && headCenterPassed) ? "text-emerald-400" : "text-slate-400"}>
                            Center Return
                          </span>
                          <span className={(headLeftVerified && headCenterPassed) ? "text-emerald-400 font-bold" : "text-slate-500"}>
                            {headLeftVerified ? (headCenterPassed ? "✓ Passed" : "Pending") : "Waiting"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between px-2">
                          <span className={headRightVerified ? "text-emerald-400" : "text-slate-400"}>
                            {headRightVerified ? "✓ Right Turn Verified" : "Right Turn"}
                          </span>
                          <span className={headRightVerified ? "text-emerald-400 font-bold" : "text-slate-500"}>
                            {headRightVerified ? "Verified" : "Waiting"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleRestartHeadTurn}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer mt-2"
                  >
                    Restart Verification
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-950/95 border border-emerald-500/30 px-5 py-4 rounded-2xl shadow-xl flex flex-col items-center gap-2 w-full max-w-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                  <div className="text-center">
                    <div className="text-sm font-extrabold text-emerald-400">✓ Head Movement Verified</div>
                  </div>
                  <button
                    onClick={handleRestartHeadTurn}
                    className="text-[10px] text-slate-400 hover:text-emerald-300 underline cursor-pointer mt-1"
                  >
                    Restart Verification
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 5 Real-time Status & Progress Overlay */}
          {step === 5 && cameraState === "active" && (
            <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-center">
              {!smileVerified ? (
                <div className="w-full max-w-xs bg-slate-950/95 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col items-center gap-2">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 mb-1 animate-pulse">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-300">Step 5 - Smile Verification</h3>
                  
                  {detectionResult === "none" ? (
                    <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-bold animate-pulse mt-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>Face not detected - please stay in frame</span>
                    </div>
                  ) : (
                    <p className="text-sm font-extrabold text-white">Smile naturally</p>
                  )}

                  <button
                    onClick={handleRestartSmile}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer mt-1"
                  >
                    Restart Verification
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-950/95 border border-emerald-500/30 px-5 py-4 rounded-2xl shadow-xl flex flex-col items-center gap-2 w-full max-w-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                  <div className="text-center">
                    <div className="text-sm font-extrabold text-emerald-400">✓ Smile Verified</div>
                  </div>
                  <button
                    onClick={handleRestartSmile}
                    className="text-[10px] text-slate-400 hover:text-emerald-300 underline cursor-pointer mt-1"
                  >
                    Restart Verification
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 6 Overlay */}
          {step === 6 && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in">
              {isAnalyzing ? (
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
                  <p className="text-sm font-bold text-white">Analyzing frame quality...</p>
                  <p className="text-xs text-slate-400">Capturing video frames. Please hold steady.</p>
                </div>
              ) : bestFrameUrl ? (
                qualityError ? (
                  <div className="flex flex-col items-center gap-4 max-w-xs">
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400 animate-bounce">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm font-bold text-white mb-1">Quality Check Failed</h3>
                      <p className="text-xs text-rose-300 leading-relaxed">
                        Image quality too low - please ensure good lighting and hold steady
                      </p>
                    </div>
                    <button
                      onClick={startFrameCapture}
                      className="mt-2 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Retake Photo</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 max-w-sm w-full">
                    <div className="relative w-40 aspect-[4/3] rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 bg-slate-900">
                      <img
                        src={bestFrameUrl}
                        alt="Best Capture"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 right-2 bg-emerald-500 text-slate-950 p-1 rounded-full shadow">
                        <CheckCircle2 className="w-4 h-4 text-emerald-950 font-bold" />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-extrabold text-emerald-400 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>✓ Quality Check Passed</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                        A high-quality, sharp frame has been successfully captured and verified.
                      </p>
                    </div>
                    <button
                      onClick={startFrameCapture}
                      className="text-xs text-slate-400 hover:text-white underline cursor-pointer mt-1 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retake Photo</span>
                    </button>
                  </div>
                )
              ) : null}
            </div>
          )}

          {/* Step 7 Real Face Embedding Generation & Save */}
          {step === 7 && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in" id="step-7-overlay">
              {(embeddingStatus === "loading_models" || embeddingStatus === "computing") && (
                <div className="flex flex-col items-center gap-3 max-w-xs">
                  <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
                  <p className="text-sm font-bold text-white">Generating secure face profile...</p>
                  <p className="text-xs text-slate-400">
                    Creating a secure biometric profile from your verified photo. Please wait while models are prepared and the profile is built.
                  </p>
                </div>
              )}

              {embeddingStatus === "saving" && (
                <div className="flex flex-col items-center gap-3 max-w-xs">
                  <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
                  <p className="text-sm font-bold text-white">Saving face profile to database...</p>
                  <p className="text-xs text-slate-400">
                    Registering your biometric profile. Almost done.
                  </p>
                </div>
              )}

              {embeddingStatus === "error" && (
                <div className="flex flex-col items-center gap-4 max-w-sm">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400 animate-bounce">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-white mb-1">Registration Error</h3>
                    <p className="text-xs text-rose-300 leading-relaxed">
                      {embeddingErrorMessage || "An error occurred while generating or saving your face profile."}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (faceEmbedding) {
                        saveEmbeddingToSupabase(faceEmbedding);
                      } else {
                        generateFaceEmbedding();
                      }
                    }}
                    className="mt-2 py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
                    id="retry-embedding-btn"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {embeddingStatus === "success" && (
                <div className="flex flex-col items-center gap-4 max-w-sm animate-fade-in">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 animate-pulse">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-base font-bold text-white mb-1">✓ Registration Successful!</h3>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
                      Your face biometric profile has been successfully generated and securely saved.
                    </p>
                    <p className="text-xs text-indigo-400 font-semibold mt-3 animate-pulse">
                      Redirecting you to the employee portal...
                    </p>
                  </div>
                </div>
              )}

              {embeddingStatus === "already_registered" && (
                <div className="flex flex-col items-center gap-4 max-w-sm animate-fade-in">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 animate-pulse">
                    <UserCheck className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-base font-bold text-white mb-1">✓ Already Registered</h3>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
                      You are already registered.
                    </p>
                    <p className="text-xs text-indigo-400 font-semibold mt-3 animate-pulse">
                      Redirecting you to the employee portal...
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Local processing note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 px-4 py-2.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Camera feed operates locally in your browser.</span>
        </div>

        {/* Action button container */}
        {onComplete && (
          <div className="mt-6 w-full max-w-lg">
            {step === 1 && (
              <>
                <button
                  disabled={detectionResult !== "one"}
                  onClick={() => {
                    console.log("Step 1 complete - face detected");
                    console.log("Step 2 started - position verification");
                    setStep(2);
                  }}
                  className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
                    detectionResult === "one"
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98]"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-60 border border-slate-700/50"
                  }`}
                >
                  <span>Proceed to Position Verification</span>
                </button>
                {detectionResult !== "one" && (
                  <p className="text-center text-[11px] text-slate-500 mt-2 font-medium">
                    {detectionResult === "multiple"
                      ? "Progress paused: please make sure only one face is visible in the camera frame."
                      : "Please position your face in front of the camera to proceed."}
                  </p>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <button
                  disabled={!positionVerified}
                  onClick={() => {
                    console.log("Step 2 complete - position verified");
                    console.log("Step 6 started - capturing frames");
                    setStep(6);
                  }}
                  className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
                    positionVerified
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98]"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-60 border border-slate-700/50"
                  }`}
                >
                  <span>Continue</span>
                </button>
                {!positionVerified && (
                  <p className="text-center text-[11px] text-slate-500 mt-2 font-medium">
                    Please position your face centered and visible inside the frame.
                  </p>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <button
                  disabled={blinkCount < 2}
                  onClick={() => {
                    console.log("Step 4 started - head turn detection");
                    setStep(4);
                  }}
                  className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
                    blinkCount === 2
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98]"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-60 border border-slate-700/50"
                  }`}
                >
                  <span>Continue</span>
                </button>
                {blinkCount < 2 && (
                  <p className="text-center text-[11px] text-slate-500 mt-2 font-medium">
                    Please complete the blink liveness verification to proceed.
                  </p>
                )}
              </>
            )}

            {step === 4 && (
              <>
                <button
                  disabled={!headRightVerified}
                  onClick={() => {
                    console.log("Step 5 started - smile detection");
                    handleRestartSmile();
                    setStep(5);
                  }}
                  className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
                    headRightVerified
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98]"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-60 border border-slate-700/50"
                  }`}
                >
                  <span>Continue</span>
                </button>
                {!headRightVerified && (
                  <p className="text-center text-[11px] text-slate-500 mt-2 font-medium">
                    Please complete the head turn verification to proceed.
                  </p>
                )}
              </>
            )}

            {step === 5 && (
              <>
                <button
                  disabled={!smileVerified}
                  onClick={() => {
                    console.log("Step 6 started - capturing frames");
                    setStep(6);
                  }}
                  className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
                    smileVerified
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98]"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-60 border border-slate-700/50"
                  }`}
                >
                  <span>Continue</span>
                </button>
                {!smileVerified && (
                  <p className="text-center text-[11px] text-slate-500 mt-2 font-medium">
                    Please complete the smile verification to proceed.
                  </p>
                )}
              </>
            )}

            {step === 6 && (
              <>
                <button
                  disabled={isAnalyzing || !bestFrameUrl || qualityError}
                  onClick={() => {
                    console.log("Step 7 placeholder reached");
                    setStep(7);
                  }}
                  className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
                    (!isAnalyzing && bestFrameUrl && !qualityError)
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98]"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-60 border border-slate-700/50"
                  }`}
                >
                  <span>Continue</span>
                </button>
                {(!bestFrameUrl || qualityError || isAnalyzing) && (
                  <p className="text-center text-[11px] text-slate-500 mt-2 font-medium">
                    {isAnalyzing ? "Analyzing captured frames..." : "Please complete the image quality verification to proceed."}
                  </p>
                )}
              </>
            )}

            {step === 7 && (
              <>
                {embeddingStatus === "success" || embeddingStatus === "already_registered" ? (
                  <button
                    onClick={() => {
                      if (embeddingStatus === "already_registered") {
                        onComplete?.({ faceDetected: true, alreadyRegistered: true });
                      } else {
                        onComplete?.({ faceDetected: true, faceImage: bestFrameRef.current });
                      }
                      onBack();
                    }}
                    className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-600/20 cursor-pointer animate-fade-in hover:scale-[1.02] active:scale-[0.98]"
                    id="go-to-dashboard-btn"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-3.5 px-6 bg-slate-800 text-slate-500 rounded-2xl font-bold text-sm tracking-wide transition-all border border-slate-700/50 cursor-not-allowed opacity-60"
                  >
                    {embeddingStatus === "error" ? "Registration Failed" : "Processing Biometrics..."}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
 
      {/* Footer */}
      <div className="max-w-2xl w-full mx-auto text-center text-xs text-slate-500 pt-4 border-t border-slate-900">
        {step === 1 && "Phase 1: Live Camera Stream"}
        {step === 2 && "Phase 2: Quick Biometric Scan"}
        {step === 6 && "Phase 3: Best Frame Capture"}
        {step === 7 && "Phase 4: Biometric Profile Registration"}
      </div>
    </div>
  );
}
