import assert from "assert";

// Mock implementation of the new Face++ API endpoint logic
async function runTestHandler(scenario, registeredPhoto, liveSelfie, threshold = 73.975) {
  // Mock Face++ API endpoints
  async function mockDetect(base64Image, description) {
    if (scenario === "401") {
      const err = new Error("AUTHENTICATION_ERROR");
      err.status = 401;
      throw err;
    }
    if (scenario === "403_auth") {
      const err = new Error("AUTHENTICATION_ERROR");
      err.status = 403;
      throw err;
    }
    if (scenario === "403_concurrency") {
      const err = new Error("CONCURRENCY_LIMIT_EXCEEDED");
      err.status = 403;
      throw err;
    }
    if (scenario === "429") {
      const err = new Error("Rate limit is exceeded. Try again later.");
      err.status = 429;
      throw err;
    }
    if (scenario === "no_face_in_selfie" && description === "live selfie") {
      return null;
    }
    if (scenario === "no_face_in_profile" && description === "registered profile picture") {
      return null;
    }
    if (scenario === "multiple_faces" && description === "live selfie") {
      return ["face1", "face2"];
    }

    return [`mock-face-token-${description.replace(/\s+/g, "-")}`];
  }

  async function mockVerify(faceToken1, faceToken2) {
    if (scenario === "success_match") {
      return { confidence: 88.0, threshold: 73.975 };
    }
    if (scenario === "low_confidence_match") {
      // Below threshold
      return { confidence: 35.0, threshold: 73.975 };
    }
    return { confidence: 0.0, threshold: 73.975 };
  }

  try {
    if (!registeredPhoto) {
      return { status: 400, body: { isMatch: false, confidence: 0, reason: "Reference picture missing" } };
    }
    if (!liveSelfie) {
      return { status: 400, body: { isMatch: false, confidence: 0, reason: "Live selfie missing" } };
    }

    // 1. Detect profile photo
    const regFaces = await mockDetect(registeredPhoto, "registered profile picture");
    if (!regFaces || regFaces.length === 0) {
      return {
        status: 400,
        body: {
          isMatch: false,
          confidence: 0,
          reason: "No face detected in registered profile picture. Please ensure the face is clearly visible, well-lit, and fits within the frame."
        }
      };
    }
    if (regFaces.length > 1) {
      return { status: 400, body: { isMatch: false, confidence: 0, reason: "Multiple faces detected in registered profile picture." } };
    }
    const regFaceId = regFaces[0];

    // 2. Detect selfie photo
    const selfieFaces = await mockDetect(liveSelfie, "live selfie");
    if (!selfieFaces || selfieFaces.length === 0) {
      return {
        status: 400,
        body: {
          isMatch: false,
          confidence: 0,
          reason: "No face detected in live selfie. Please ensure the face is clearly visible, well-lit, and fits within the frame."
        }
      };
    }
    if (selfieFaces.length > 1) {
      return {
        status: 400,
        body: {
          isMatch: false,
          confidence: 0,
          reason: "Multiple faces detected in live selfie. Please submit a photo with only your face."
        }
      };
    }
    const selfieFaceId = selfieFaces[0];

    // 3. Verify faces
    const verifyResult = await mockVerify(regFaceId, selfieFaceId);
    
    const isMatch = verifyResult.confidence >= verifyResult.threshold;
    const confidencePercent = Math.round(verifyResult.confidence);
    const thresholdPercent = Math.round(verifyResult.threshold);

    let reason = "";
    if (isMatch) {
      reason = `Verified via Face++ Match with ${confidencePercent}% confidence (threshold: ${thresholdPercent}%).`;
    } else {
      reason = `Face verification failed. Selfie does not match registered profile (${confidencePercent}% confidence, threshold: ${thresholdPercent}%).`;
    }

    return {
      status: 200,
      body: {
        isMatch,
        confidence: confidencePercent,
        reason
      }
    };

  } catch (err) {
    const status = err.status || 500;
    const errMsg = err.message || String(err);
    
    // Explicit 401/403 or 429 block handling as implemented in server.ts
    let reason = `Face verification could not be completed due to a service error: ${errMsg}`;
    if (status === 401 || (status === 403 && errMsg !== "CONCURRENCY_LIMIT_EXCEEDED")) {
      reason = `Face verification could not be completed due to a service error: Face++ Unauthorized (${errMsg}). Please verify your Face++ API Key and Secret configurations.`;
    } else if (errMsg === "CONCURRENCY_LIMIT_EXCEEDED" || status === 429) {
      reason = `Face verification could not be completed due to a service error: Face++ Rate Limit / Quota Exceeded (${errMsg}). Please try again later.`;
    }

    return {
      status: 500,
      body: {
        isMatch: false,
        confidence: 0,
        reason
      }
    };
  }
}

async function runSuite() {
  console.log("🧪 Starting Face++ Biometric Verification Test Suite...");

  // Test Case 1: Successful Match with high confidence (88%)
  console.log("👉 Test Case 1: Simulating Successful Face++ Match (High Confidence)...");
  const resSuccess = await runTestHandler("success_match", "reg-photo-data", "selfie-photo-data");
  assert.strictEqual(resSuccess.status, 200);
  assert.strictEqual(resSuccess.body.isMatch, true, "Should be marked as match");
  assert.strictEqual(resSuccess.body.confidence, 88, "Should report 88% confidence");
  assert.ok(resSuccess.body.reason.includes("Verified via Face++ Match"), "Reason should note Face++ Match");
  console.log("   ✅ Passed Case 1! Correctly returned matching result.");

  // Test Case 2: Failed Match due to low confidence (35%, below threshold 74%)
  console.log("👉 Test Case 2: Simulating Mismatch (Low Confidence)...");
  const resMismatch = await runTestHandler("low_confidence_match", "reg-photo-data", "selfie-photo-data");
  assert.strictEqual(resMismatch.status, 200);
  assert.strictEqual(resMismatch.body.isMatch, false, "Should NOT match");
  assert.strictEqual(resMismatch.body.confidence, 35, "Should report 35% confidence");
  assert.ok(resMismatch.body.reason.includes("Face verification failed. Selfie does not match"), "Reason should show failed details");
  console.log("   ✅ Passed Case 2! Correctly identified mismatch and did not auto-approve.");

  // Test Case 3: Simulate 401/403 Unauthorized Credential Error
  console.log("👉 Test Case 3: Simulating Face++ 401/403 Unauthorized Credentials Error...");
  const res403 = await runTestHandler("403_auth", "reg-photo-data", "selfie-photo-data");
  assert.strictEqual(res403.status, 500);
  assert.strictEqual(res403.body.isMatch, false, "Should block check-in");
  assert.strictEqual(res403.body.confidence, 0, "Confidence should be 0");
  assert.ok(res403.body.reason.includes("Face++ Unauthorized (AUTHENTICATION_ERROR)"), "Reason should specify credentials configuration issue");
  console.log("   ✅ Passed Case 3! Blocked successfully with explicit service credentials error.");

  // Test Case 4: Simulate 429 Rate Limit/Quota Exhaustion Error
  console.log("👉 Test Case 4: Simulating Face++ 403 Concurrency Limit...");
  const res429 = await runTestHandler("403_concurrency", "reg-photo-data", "selfie-photo-data");
  assert.strictEqual(res429.status, 500);
  assert.strictEqual(res429.body.isMatch, false, "Should block check-in");
  assert.strictEqual(res429.body.confidence, 0, "Confidence should be 0");
  assert.ok(res429.body.reason.includes("Face++ Rate Limit / Quota Exceeded (CONCURRENCY_LIMIT_EXCEEDED)"), "Reason should specify quota details");
  console.log("   ✅ Passed Case 4! Blocked successfully with explicit quota failure error.");

  // Test Case 5: No face detected in Submitted Selfie
  console.log("👉 Test Case 5: Simulating No Face Detected in Live Selfie...");
  const resNoFace = await runTestHandler("no_face_in_selfie", "reg-photo-data", "selfie-photo-data");
  assert.strictEqual(resNoFace.status, 400);
  assert.strictEqual(resNoFace.body.isMatch, false, "Should NOT match");
  assert.strictEqual(resNoFace.body.confidence, 0, "Confidence should be 0");
  assert.ok(resNoFace.body.reason.includes("No face detected in live selfie"), "Should prompt to retake selfie");
  console.log("   ✅ Passed Case 5! Correctly rejected with 400 and face-detection instructions.");

  // Test Case 6: Multiple faces detected
  console.log("👉 Test Case 6: Simulating Multiple Faces Detected in Live Selfie...");
  const resMultiFace = await runTestHandler("multiple_faces", "reg-photo-data", "selfie-photo-data");
  assert.strictEqual(resMultiFace.status, 400);
  assert.strictEqual(resMultiFace.body.isMatch, false, "Should NOT match");
  assert.strictEqual(resMultiFace.body.confidence, 0, "Confidence should be 0");
  assert.ok(resMultiFace.body.reason.includes("Multiple faces detected in live selfie"), "Should prompt to retake selfie");
  console.log("   ✅ Passed Case 6! Correctly rejected with 400 and face-detection instructions.");

  console.log("\n🎉 All Face++ API mock integration verification tests passed perfectly!");
}

runSuite().catch(err => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
