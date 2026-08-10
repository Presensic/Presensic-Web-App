// faceUtils.ts
// Shared helpers for enrollment + verification.
// Requires: npm install face-api.js
// Requires model weights in /public/models — see MODELS_README.md

import * as faceapi from "face-api.js";

let modelsLoaded = false;

export async function loadFaceModels(modelUrl = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights") {
  if (modelsLoaded) return;
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
      faceapi.nets.faceExpressionNet.loadFromUri(modelUrl),
    ]);
  } catch (err) {
    console.warn("Failed to load from CDN, trying local /models:", err);
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      faceapi.nets.faceExpressionNet.loadFromUri("/models"),
    ]);
  }
  modelsLoaded = true;
}

export async function detectSingleFace(video: HTMLVideoElement) {
  return faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()
    .withFaceExpressions();
}

// ---- Eye Aspect Ratio (blink detection) ----
function dist(a: faceapi.Point, b: faceapi.Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function eyeAspectRatio(eyePoints: faceapi.Point[]) {
  const p = eyePoints;
  const vertical1 = dist(p[1], p[5]);
  const vertical2 = dist(p[2], p[4]);
  const horizontal = dist(p[0], p[3]);
  return (vertical1 + vertical2) / (2 * horizontal);
}

export function getEAR(landmarks: faceapi.FaceLandmarks68) {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  return (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;
}

// ---- Yaw estimate (left/right turn) ----
export function getYawRatio(landmarks: faceapi.FaceLandmarks68) {
  const jaw = landmarks.getJawOutline();
  const nose = landmarks.getNose();
  const noseTip = nose[3];
  const leftEdge = jaw[0].x;
  const rightEdge = jaw[16].x;
  const faceWidth = rightEdge - leftEdge;
  if (faceWidth === 0) return 0;
  const midpoint = (leftEdge + rightEdge) / 2;
  return (noseTip.x - midpoint) / (faceWidth / 2);
}

// ---- Smile check ----
export function isSmiling(expressions: faceapi.FaceExpressions, threshold = 0.7) {
  return expressions.happy >= threshold;
}

// ---- Descriptor matching ----
export function descriptorDistance(a: Float32Array, b: Float32Array) {
  return faceapi.euclideanDistance(a, b);
}

export const MATCH_THRESHOLD = 0.65;

export function averageDescriptors(descriptors: Float32Array[]): Float32Array {
  const len = descriptors[0].length;
  const avg = new Float32Array(len);
  for (const d of descriptors) {
    for (let i = 0; i < len; i++) avg[i] += d[i];
  }
  for (let i = 0; i < len; i++) avg[i] /= descriptors.length;
  return avg;
}

// ---- Geolocation ----
export interface GeoPoint {
  lat: number;
  lng: number;
}

export function getCurrentLocation(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported by this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export function distanceMeters(a: GeoPoint, b: GeoPoint) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---- Storage (swap this for a real backend call later) ----
export interface FaceEnrollment {
  userId: string;
  descriptor: number[];
  enrolledAt: string;
  officeLocation: GeoPoint;
}

const STORAGE_PREFIX = "presensic_face_";

export function saveEnrollment(userId: string, descriptor: Float32Array, officeLocation: GeoPoint) {
  const record: FaceEnrollment = {
    userId,
    descriptor: Array.from(descriptor),
    enrolledAt: new Date().toISOString(),
    officeLocation,
  };
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(record));
  } catch (e) {
    console.error("Failed to save face enrollment", e);
  }
}

export function getEnrollment(userId: string): FaceEnrollment | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return null;
    return JSON.parse(raw) as FaceEnrollment;
  } catch (e) {
    console.error("Failed to read face enrollment", e);
    return null;
  }
}
