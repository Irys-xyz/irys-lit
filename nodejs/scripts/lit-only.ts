import * as LitJsSdk from "@lit-protocol/lit-node-client-nodejs";
import { LitNetwork } from "@lit-protocol/constants";
import { SiweMessage } from "siwe";
import { ethers } from "ethers";
import dotenv from "dotenv";
import {
  LitAccessControlConditionResource,
  LitAbility,
  createSiweMessageWithRecaps,
  generateAuthSig,
} from "@lit-protocol/auth-helpers";

dotenv.config();

async function main() {
  // Initialize LitNodeClient for Node.js
  const litNodeClient = new LitJsSdk.LitNodeClientNodeJs({
    alertWhenUnauthorized: false,
    litNetwork: LitNetwork.DatilDev, 
    debug: false,
  });

  // Connect to the Lit network
  await litNodeClient.connect();

  // Initialize the signer
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);
  const address = await wallet.getAddress();
  
  // Craft the SIWE message
  const domain = "localhost";
  const origin = "https://localhost/login";
  const statement = "Sign this message to confirm ownership of your wallet.";
  const expirationTime = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

  // Generate SIWE Message
  const siweMessage = new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: "1",
    chainId: 1,
    nonce: await litNodeClient.getLatestBlockhash(),
    expirationTime,
  });
  const messageToSign = siweMessage.prepareMessage();
  const signature = await wallet.signMessage(messageToSign);

  // Create an AuthSig
  const authSig = {
    sig: signature,
    derivedVia: "web3.eth.personal.sign",
    signedMessage: messageToSign,
    address: address,
  };

  // Define the authNeededCallback function
  const authNeededCallback = async (params: any) => {
    const toSign = await createSiweMessageWithRecaps({
      uri: params.uri,
      expiration: params.expiration,
      resources: params.resourceAbilityRequests,
      walletAddress: address,
      nonce: await litNodeClient.getLatestBlockhash(),
      litNodeClient: litNodeClient,
    });

    const authSig = await generateAuthSig({
      signer: wallet,
      toSign,
    });

    return authSig;
  };

  // Define the Lit resource and resource abilities
  const litResource = new LitAccessControlConditionResource("*");
  const resourceAbilities = [
    {
      resource: litResource,
      ability: LitAbility.AccessControlConditionDecryption,
    },
  ];

  // Get Session Signatures
  const sessionSigs = await litNodeClient.getSessionSigs({
    chain: "ethereum",
    resourceAbilityRequests: resourceAbilities,
    authNeededCallback,
  });

  // Define access control conditions directly
  const accessControlConditions = [
    {
      contractAddress: "",
      standardContractType: "",
      chain: "ethereum",
      method: "eth_getBalance",
      parameters: [":userAddress", "latest"],
      returnValueTest: {
        comparator: ">=",
        value: "0000000000000", // 0.000000 ETH
      },
    },
  ];

  // Encrypt data
  const messageToEncrypt = "Irys + Lit is 🔥x2";
  const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
    {
      //@ts-ignore
      accessControlConditions, 
      dataToEncrypt: messageToEncrypt,
    },
    litNodeClient
  );
  console.log(`Data encrypted ${ciphertext}`);

  // Decrypt data
  const decryptedString = await LitJsSdk.decryptToString(
    {
      //@ts-ignore
      accessControlConditions,
      chain: "ethereum",
      ciphertext,
      dataToEncryptHash,
      sessionSigs,
    },
    litNodeClient,
  );

  console.log(`Message decrypted: ${decryptedString}`);

  // Disconnect from the Lit network
  await litNodeClient.disconnect();
}

main().catch((error) => {
  console.error("Error in main function:", error);
});
