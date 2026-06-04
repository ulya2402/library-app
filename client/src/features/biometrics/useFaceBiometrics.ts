import { useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

export const useFaceBiometrics = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const loadModels = useCallback(async () => {
    if (isModelLoaded) return;
    try {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      setIsModelLoaded(true);
    } catch (error: any) {
      setModelError("Failed to load AI models");
      console.error("Model Load Error:", error);
    }
  }, [isModelLoaded]);

  const extractFaceDescriptor = async (videoElement: HTMLVideoElement): Promise<number[] | null> => {
    try {
      const detection = await faceapi.detectSingleFace(videoElement)
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (!detection) return null;
      return Array.from(detection.descriptor);
    } catch (error: any) {
      console.error("Extraction Error:", error);
      return null;
    }
  };

  return { loadModels, isModelLoaded, modelError, extractFaceDescriptor };
};