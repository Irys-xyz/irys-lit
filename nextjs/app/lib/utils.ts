import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import { ethers } from "ethers";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import {
  LitAccessControlConditionResource,
  LitAbility,
  createSiweMessageWithRecaps,
  generateAuthSig,
} from "@lit-protocol/auth-helpers";

const gatewayAddress = "https://gateway.irys.xyz/";

const getIrysUploader = async () => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const irysUploader = await WebUploader(WebEthereum).withAdapter(EthersV6Adapter(provider));

  return irysUploader;
};

const litClient = new LitNodeClient({
  litNetwork: "datil-dev",
});

/**
 * Define access control conditions for encryption.
 * @returns {object[]} Array of access control conditions.
 * @author @lukecd
 */
const getAccessControlConditions = () => {
  return [
    {
      contractAddress: "",
      standardContractType: "",
      chain: "ethereum",
      method: "eth_getBalance",
      parameters: [":userAddress", "latest"],
      returnValueTest: {
        comparator: ">=",
        value: "0000000000000", // 0 ETH, so anyone can open
      },
    },
  ];
};

/**
 * Encrypts a string using Lit Protocol.
 * @param {string} text - The text to encrypt.
 * @returns {Promise<{ ciphertext: string; dataToEncryptHash: string }>} The encrypted text and its hash.
 */
export const encryptString = async (text: string): Promise<{ ciphertext: string; dataToEncryptHash: string }> => {
  await litClient.connect();

  const accessControlConditions = getAccessControlConditions();

  const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
    {
      accessControlConditions,
      dataToEncrypt: text,
    },
    litClient
  );

  console.log({ ciphertext, dataToEncryptHash });
  return { ciphertext, dataToEncryptHash };
};

/**
 * Uploads data to Irys.
 * @param {string} cipherText - The encrypted text.
 * @param {string} dataToEncryptHash - The hash of the encrypted data.
 * @returns {Promise<string>} The ID of the stored data or an empty string if failed.
 */
export const uploadToIrys = async (cipherText: string, dataToEncryptHash: string): Promise<string> => {
  const irysUploader = await getIrysUploader();

  const dataToUpload = {
    cipherText: cipherText,
    dataToEncryptHash: dataToEncryptHash,
    accessControlConditions: getAccessControlConditions(),
  };

  try {
    const tags = [{ name: "Content-Type", value: "application/json" }];
    const receipt = await irysUploader.upload(JSON.stringify(dataToUpload), { tags });
    return receipt?.id ? `${gatewayAddress}${receipt.id}` : "";
  } catch (error) {
    console.error("Error uploading data: ", error);
    throw error;
  }
};

/**
 * Retrieves encrypted data from Irys.
 * @param {string} id - The ID of the data to retrieve.
 * @returns {Promise<[string, string, object[]]>} The retrieved ciphertext, hash, and access control conditions.
 */
export const downloadFromIrys = async (id: string): Promise<[string, string, object[]]> => {
  const url = `${gatewayAddress}${id}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to retrieve data for ID: ${id}`);
    const data = await response.json();

    const ciphertext = data.cipherText; // Assuming this is already a string
    const dataToEncryptHash = data.dataToEncryptHash; // Assuming this is already a string

    return [ciphertext, dataToEncryptHash, data.accessControlConditions];
  } catch (error) {
    console.error("Error retrieving data: ", error);
    return ["", "", []]; // Return default values if retrieval fails
  }
};

/**
 * Decrypts encrypted data using Lit Protocol.
 * @param {string} encryptedText - The encrypted text.
 * @returns {Promise<string>} The decrypted text.
 */
export const decryptData = async (encryptedText: string, dataToEncryptHash: string): Promise<string> => {
  console.log({ encryptedText })
  console.log({ dataToEncryptHash })

  await litClient.connect();

  // Connect to the wallet
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const walletAddress = await signer.getAddress();

  // Get the latest blockhash
  const latestBlockhash = await litClient.getLatestBlockhash();

  // Define the authNeededCallback function
  const authNeededCallback = async (params:any) => {
    if (!params.uri) throw new Error("uri is required");
    if (!params.expiration) throw new Error("expiration is required");
    if (!params.resourceAbilityRequests) throw new Error("resourceAbilityRequests is required");

    // Create the SIWE message
    const toSign = await createSiweMessageWithRecaps({
      uri: params.uri,
      expiration: params.expiration,
      resources: params.resourceAbilityRequests,
      walletAddress: walletAddress,
      nonce: latestBlockhash,
      litNodeClient: litClient,
    });

    // Generate the authSig
    const authSig = await generateAuthSig({
      signer: signer,
      toSign,
    });

    return authSig;
  };

  // Define the Lit resource
  const litResource = new LitAccessControlConditionResource("*");
  console.log({litResource})

  // Get the session signatures
  const sessionSigs = await litClient.getSessionSigs({
    chain: "ethereum",
    resourceAbilityRequests: [
      {
        resource: litResource,
        ability: LitAbility.AccessControlConditionDecryption,
      },
    ],
    authNeededCallback,
  });
  console.log({sessionSigs})

  // Decrypt the data
  const decryptedString = await LitJsSdk.decryptToString(
    {
      accessControlConditions: getAccessControlConditions(),
      chain: "ethereum",
      ciphertext: encryptedText,
      dataToEncryptHash,
      sessionSigs,
    },
    litClient
  );
  console.log({decryptedString})
  return decryptedString;
};

