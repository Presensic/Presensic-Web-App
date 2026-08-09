import fs from 'fs';
let code = fs.readFileSync('src/components/EmployeeDashboard.tsx', 'utf-8');

// The code currently has:
//      const ctx = canvas.getContext("2d");
//      ctx?.drawImage(video, 0, 0);
//      console.log("Models loaded status:", isModelsLoaded);
//      ...
//      console.log("Detection result:", detection);
//      console.log("Detection completed at:", Date.now(), "Duration:", Date.now() - startTime);

// We need to replace the missing code.

const fixStr = `      const dataUrl = canvas.toDataURL("image/jpeg");
      setVerificationPhoto(dataUrl);
      
      // Move to verifying stage
      setVerificationStage("verifying");
      setIsVerifyingFace(true);
      setFaceError(null);
      
      try {
        console.log("Models loaded status:", isModelsLoaded);
        console.log("Canvas dimensions:", canvas.width, canvas.height);
        const startTime = Date.now();
        console.log("Detection attempt starting at:", startTime);

        const detectPromise = faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        const timeoutPromise = new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error("TIMEOUT")), 15000)
        );

        const detection = await Promise.race([detectPromise, timeoutPromise]);
        
        console.log("Detection result:", detection);
        console.log("Detection completed at:", Date.now(), "Duration:", Date.now() - startTime);`;

code = code.replace(/ctx\?\.drawImage\(video, 0, 0\);[\s\S]*?console\.log\("Detection completed at:", Date\.now\(\), "Duration:", Date\.now\(\) - startTime\);\s+console\.log\("Detection result:", detection\);\s+console\.log\("Detection completed at:", Date\.now\(\), "Duration:", Date\.now\(\) - startTime\);/,
  `ctx?.drawImage(video, 0, 0);\n` + fixStr);

fs.writeFileSync('src/components/EmployeeDashboard.tsx', code);
