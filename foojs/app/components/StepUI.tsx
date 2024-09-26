"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { encryptString, uploadToIrys, downloadFromIrys, decryptData } from "@/app/lib/utils";

const StepUI: React.FC = () => {
  const { isConnected } = useAccount();
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number | null>(null);
  const [inputText, setInputText] = useState<string>("");

  const [encryptedText, setEncryptedText] = useState<string>("");
  const [dataToEncryptHash, setDataToEncryptHash] = useState<string>("");
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [downloadedData, setDownloadedData] = useState<object | null>(null);
  const [decryptedData, setDecryptedData] = useState<string>("");

  useEffect(() => {
    if (isConnected) {
      setActiveStep(2);
    }
  }, [isConnected]);

  const handleEncrypt = async () => {
    setIsProcessing(true);
    setProcessingStep(2);
    try {
      const { ciphertext, dataToEncryptHash } = await encryptString(inputText);
      setEncryptedText(ciphertext);
      setDataToEncryptHash(dataToEncryptHash);
      setActiveStep(3);
    } catch (error) {
      console.error("Error during encryption:", error);
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  const handleUpload = async () => {
    setIsProcessing(true);
    setProcessingStep(3);
    try {
      const url = await uploadToIrys(encryptedText, dataToEncryptHash);
      setUploadedUrl(url);
      setActiveStep(4);
    } catch (error) {
      console.error("Error during upload:", error);
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  const handleDownload = async () => {
    setIsProcessing(true);
    setProcessingStep(4);
    try {
      const [ciphertext, hash, conditions] = await downloadFromIrys(uploadedUrl.split("/").pop() || "");
      setDownloadedData({ ciphertext, hash, conditions });
      setActiveStep(5);
    } catch (error) {
      console.error("Error during download:", error);
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  const handleDecrypt = async () => {
    setIsProcessing(true);
    setProcessingStep(5);
    try {
      const decrypted = await decryptData(encryptedText, dataToEncryptHash);
      setDecryptedData(decrypted);
    } catch (error) {
      console.error("Error during decryption:", error);
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  const renderSpinnerOrButton = (
    buttonText: string,
    onClick: () => void,
    isDisabled: boolean,
    step: number
  ) => {
    return isProcessing && processingStep === step ? (
      <div className="flex justify-center items-center mt-5">
        <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-primary"></div>
      </div>
    ) : (
      <button
        className="mt-4 px-4 py-2 bg-primary text-white rounded disabled:opacity-50"
        onClick={onClick}
        disabled={isDisabled}
      >
        {buttonText}
      </button>
    );
  };  

  return (
    <div className="flex flex-col items-center p-8 space-y-8 w-full">
      <div className="flex items-center justify-center w-full md:w-3/4 lg:w-3/4 p-4 border border-gray-200 h-40">
        <ConnectButton />
      </div>

      <div className="w-full md:w-3/4 lg:w-3/4 p-4 border border-gray-200 h-40">
        <label className="block mb-2 text-gray-700">Enter text to be encrypted by Lit Protocol</label>
        <input
          type="text"
          className="w-full p-2 border rounded"
          placeholder="Enter text..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={activeStep !== 2 || isProcessing}
        />
        {encryptedText ? (
          <p className="mt-2 text-green-500">
            Encrypted Text: {encryptedText.slice(0, 10)}...{encryptedText.slice(-10)}
          </p>
        ) : (
          renderSpinnerOrButton("Encrypt", handleEncrypt, activeStep !== 2, 2)
        )}
      </div>

      <div className="w-full md:w-3/4 lg:w-3/4 p-4 border border-gray-200 h-40">
        {uploadedUrl ? (
          <p className="mt-2 text-green-500">
            Data uploaded:{" "}
            <a href={uploadedUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {uploadedUrl}
            </a>
          </p>
        ) : (
          renderSpinnerOrButton("Step 3: Upload to Irys", handleUpload, activeStep !== 3, 3)
        )}
      </div>

      <div className="w-full md:w-3/4 lg:w-3/4 p-4 border border-gray-200 h-40">
        {downloadedData ? (
          <pre className="mt-2 bg-gray-100 p-2 rounded max-h-36 overflow-y-auto w-full">
            {JSON.stringify(downloadedData, null, 2)}
          </pre>
        ) : (
          renderSpinnerOrButton("Step 4: Download from Irys", handleDownload, activeStep !== 4, 4)
        )}
      </div>

      <div className="w-full md:w-3/4 lg:w-3/4 p-4 border border-gray-200 h-40">
        {decryptedData ? (
          <p className="mt-2 text-red-500">Decrypted Data: {decryptedData}</p>
        ) : (
          renderSpinnerOrButton("Step 5: Decrypt Data", handleDecrypt, activeStep !== 5, 5)
        )}
      </div>
    </div>
  );
};

export default StepUI;
