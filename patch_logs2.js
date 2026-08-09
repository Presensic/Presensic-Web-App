import fs from 'fs';
let code = fs.readFileSync('src/components/EmployeeDashboard.tsx', 'utf-8');

const regex = /const dataUrl = canvas\.toDataURL\("image\/jpeg"\);[\s\S]*?const detection = await Promise\.race\(\[detectPromise, timeoutPromise\]\);/g;

code = code.replace(regex, 
`console.log("Models loaded status:", isModelsLoaded);
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
                                  console.log("Detection completed at:", Date.now(), "Duration:", Date.now() - startTime);`);

fs.writeFileSync('src/components/EmployeeDashboard.tsx', code);
