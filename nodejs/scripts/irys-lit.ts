import * as LitJsSdk from "@lit-protocol/lit-node-client-nodejs";
import { LitNetwork } from "@lit-protocol/constants";
import { Uploader } from "@irys/upload";
import { Ethereum } from "@irys/upload-ethereum";
import { ethers } from "ethers";
import { SiweMessage } from "siwe";
import dotenv from "dotenv";
import {
  LitAccessControlConditionResource,
  LitAbility,
  createSiweMessageWithRecaps,
  generateAuthSig,
} from "@lit-protocol/auth-helpers";

dotenv.config();

// Our connection to the LitProtocol network
let litNodeClientInstance: LitJsSdk.LitNodeClientNodeJs | null = null;

/**
 * Initialize Irys Uploader with Ethereum wallet.
 * @returns {Promise<any>} Configured Irys uploader instance.
 * @author @lukecd
 */
const getIrysUploader = async (): Promise<any> => {
  const irysUploader = await Uploader(Ethereum).withWallet(process.env.PRIVATE_KEY);
  return irysUploader;
};

/**
 * Initialize and connect to Lit Node Client.
 * @returns {Promise<LitJsSdk.LitNodeClientNodeJs>} Connected Lit node client.
 * @author @lukecd
 */
async function getLitNodeClient(): Promise<LitJsSdk.LitNodeClientNodeJs> {
  if (litNodeClientInstance) {
    return litNodeClientInstance; // Return the cached instance if it exists
  }

  // Create a new instance if it doesn't exist
  litNodeClientInstance = new LitJsSdk.LitNodeClientNodeJs({
    alertWhenUnauthorized: false,
    litNetwork: LitNetwork.DatilDev, 
    debug: false,
  });

  await litNodeClientInstance.connect();
  return litNodeClientInstance;
}

/**
 * Generate authentication signature (AuthSig) for Lit Protocol.
 * @returns {Promise<any>} Generated AuthSig object.
 * @author @lukecd
 */
async function getAuthSig(): Promise<any> {
  const litNodeClient = await getLitNodeClient();
  const nonce = await litNodeClient.getLatestBlockhash();
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);
  const address = await wallet.getAddress();

  const domain = "localhost";
  const origin = "https://localhost/login";
  const statement = "Sign this message to confirm ownership of your wallet.";
  const expirationTime = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

  const siweMessage = new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: "1",
    chainId: 1,
    nonce,
    expirationTime,
  });
  const messageToSign = siweMessage.prepareMessage();
  const signature = await wallet.signMessage(messageToSign);

  const authSig = {
    sig: signature,
    derivedVia: "web3.eth.personal.sign",
    signedMessage: messageToSign,
    address,
  };

  return authSig;
}

/**
 * Define access control conditions for encryption.
 * @returns {object[]} Array of access control conditions.
 * @author @lukecd
 */
function getAccessControlConditions(): object[] {
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
}

/**
 * Encrypt data using the Lit Protocol.
 * @param {string} dataToEncrypt - The data to be encrypted.
 * @returns {Promise<[string, string]>} Encrypted data and its hash.
 * @author @lukecd
 */
async function encryptData(dataToEncrypt: string): Promise<[string, string]> {
  const authSig = await getAuthSig();
  const accessControlConditions = getAccessControlConditions();
  const litNodeClient = await getLitNodeClient();

  const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
    {
      //@ts-ignore
      accessControlConditions,
      dataToEncrypt,
    },
    litNodeClient
  );
  return [ciphertext, dataToEncryptHash];
}

/**
 * Decrypt data using the Lit Protocol.
 * @param {string} ciphertext - The encrypted data.
 * @param {string} dataToEncryptHash - The hash of the encrypted data.
 * @param {object[]} accessControlConditions - The access control conditions.
 * @returns {Promise<string>} Decrypted data string.
 * @author @lukecd
 */
async function decryptData(
  ciphertext: string,
  dataToEncryptHash: string,
  accessControlConditions: object[]
): Promise<string> {
  const litNodeClient = await getLitNodeClient();

  const sessionSigs = await litNodeClient.getSessionSigs({
    chain: "ethereum",
    resourceAbilityRequests: [
      {
        resource: new LitAccessControlConditionResource("*"),
        ability: LitAbility.AccessControlConditionDecryption,
      },
    ],
    authNeededCallback: async (params: any) => {
      const toSign = await createSiweMessageWithRecaps({
        uri: params.uri,
        expiration: params.expiration,
        resources: params.resourceAbilityRequests,
        walletAddress: await (await new ethers.Wallet(process.env.PRIVATE_KEY!)).getAddress(),
        nonce: await litNodeClient.getLatestBlockhash(),
        litNodeClient,
      });

      return await generateAuthSig({
        signer: new ethers.Wallet(process.env.PRIVATE_KEY!),
        toSign,
      });
    },
  });

  const decryptedString = await LitJsSdk.decryptToString(
    {
      //@ts-ignore
      accessControlConditions,
      chain: "ethereum",
      ciphertext,
      dataToEncryptHash,
      sessionSigs,
    },
    litNodeClient
  );

  return decryptedString;
}

/**
 * Retrieve encrypted data from Irys.
 * @param {string} id - The ID of the data to retrieve.
 * @returns {Promise<[string, string, object[]]>} Retrieved data from Irys.
 * @author @lukecd
 */
async function retrieveFromIrys(id: string): Promise<[string, string, object[]]> {
  const gatewayAddress = "https://gateway.irys.xyz/";
  const url = `${gatewayAddress}${id}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to retrieve data for ID: ${id}`);
    const data = await response.json();

    // Convert the retrieved ciphertext and hash to strings
    const ciphertext = data.cipherText; // Assuming this is already a string
    const dataToEncryptHash = data.dataToEncryptHash; // Assuming this is already a string

    return [ciphertext, dataToEncryptHash, data.accessControlConditions];
  } catch (e) {
    console.error("Error retrieving data: ", e);
    return ["", "", []]; // Return default values if retrieval fails
  }
}

/**
 * Store encrypted data on Irys.
 * @param {string} cipherText - The encrypted data.
 * @param {string} dataToEncryptHash - The hash of the encrypted data.
 * @returns {Promise<string>} The ID of the stored data or empty string if failed.
 * @author @lukecd
 */
async function storeOnIrys(cipherText: string, dataToEncryptHash: string): Promise<string> {
  const irysUploader = await getIrysUploader();

  const dataToUpload = {
    cipherText: cipherText,
    dataToEncryptHash: dataToEncryptHash,
    accessControlConditions: getAccessControlConditions(),
  };

  try {
    const tags = [{ name: "Content-Type", value: "application/json" }];
    const receipt = await irysUploader.upload(JSON.stringify(dataToUpload), { tags });
    return receipt?.id || ""; // Return the ID or empty string if undefined
  } catch (e) {
    console.error("Error uploading data: ", e);
    return "";
  }
}

/**
 * Main function to execute the encryption, storage, retrieval, and decryption flow.
 * @author @lukecd
 */
async function main(): Promise<void> {
  const messageToEncrypt = "Irys + Lit is 🔥x2";

  const [cipherText, dataToEncryptHash] = await encryptData(messageToEncrypt);
  const encryptedDataID = await storeOnIrys(cipherText, dataToEncryptHash);

  console.log(`Data stored at https://gateway.irys.xyz/${encryptedDataID}`);

  const retrievedData = await retrieveFromIrys(encryptedDataID);
  if (!retrievedData) {
    console.error("Failed to retrieve data from Irys.");
    return;
  }
  const [cipherTextRetrieved, dataToEncryptHashRetrieved, accessControlConditions] = retrievedData;

  const decryptedString = await decryptData(cipherTextRetrieved, dataToEncryptHashRetrieved, accessControlConditions);
  console.log("Decrypted String: ", decryptedString);

  // Disconnect from the Lit network
  const litNodeClient = await getLitNodeClient();
  await litNodeClient.disconnect();
}

main().catch((error) => {
  console.error("Error in main function: ", error);
});
