import * as LitJsSdk from "@lit-protocol/lit-node-client-nodejs";
import Irys from "@irys/sdk";
import ethers from "ethers";
import siwe from "siwe";
import dotenv from "dotenv";
dotenv.config();

// Returns a configured Irys object
async function getIrys() {
	const url = "https://devnet.irys.xyz";
	const providerUrl = "https://rpc-mumbai.maticvigil.com";
	const token = "matic";

	const irys = new Irys({
		url, // URL of the node you want to connect to
		token, // Token used for payment
		key: process.env.PRIVATE_KEY, // Private key
		config: { providerUrl }, // Optional provider URL, only required when using Devnet
	});
	return irys;
}

// Returns a configured Lit node object
async function getLitNodeClient() {
	// Initialize LitNodeClient
	const litNodeClient = new LitJsSdk.LitNodeClientNodeJs({
		alertWhenUnauthorized: false,
		litNetwork: "cayenne",
	});
	await litNodeClient.connect();

	return litNodeClient;
}

async function getAuthSig() {
	// Initialize the signer
	const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
	const address = ethers.utils.getAddress(await wallet.getAddress());

	// Craft the SIWE message
	const domain = "localhost";
	const origin = "https://localhost/login";
	const statement = "This is a test statement.  You can put anything you want here.";
	const siweMessage = new siwe.SiweMessage({
		domain,
		address: address,
		statement,
		uri: origin,
		version: "1",
		chainId: "1",
	});
	const messageToSign = siweMessage.prepareMessage();

	// Sign the message and format the authSig
	const signature = await wallet.signMessage(messageToSign);
	const authSig = {
		sig: signature,
		derivedVia: "web3.eth.personal.sign",
		signedMessage: messageToSign,
		address: address,
	};

	return authSig;
}

// This defines who can decrypt the data
function getAccessControlConditions() {
	const accessControlConditions = [
		{
			contractAddress: "",
			standardContractType: "",
			chain: "ethereum",
			method: "eth_getBalance",
			parameters: [":userAddress", "latest"],
			returnValueTest: {
				comparator: ">=",
				value: "0", // 0 ETH, so anyone can open
			},
		},
	];

	return accessControlConditions;
}

async function encryptData(dataToEncrypt) {
	const authSig = await getAuthSig();
	const accessControlConditions = getAccessControlConditions();
	const litNodeClient = await getLitNodeClient();

	// 1. Encryption
	// <Blob> encryptedString
	// <Uint8Array(32)> dataToEncryptHash
	const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
		{
			authSig,
			accessControlConditions,
			dataToEncrypt: dataToEncrypt,
			chain: "ethereum",
		},
		litNodeClient,
	);
	console.log("just encrypted this ciphertext=", ciphertext);
	return [ciphertext, dataToEncryptHash];
}

async function decryptData(ciphertext, dataToEncryptHash) {
	const authSig = await getAuthSig();
	const accessControlConditions = getAccessControlConditions();
	const litNodeClient = await getLitNodeClient();

	// <String> toDecrypt
	// <Uint8Array(32)> dataToEncryptHash
	let decryptedString;

	try {
		decryptedString = await LitJsSdk.decryptToString(
			{
				authSig,
				accessControlConditions,
				ciphertext,
				dataToEncryptHash,
				chain: "ethereum",
			},
			litNodeClient,
		);
	} catch (e) {
		console.log(e);
	}

	return decryptedString;
}

async function retrieveFromIrys(id) {
	const gatewayAddress = "https://gateway.irys.xyz/";
	const url = `${gatewayAddress}${id}`;

	try {
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Failed to retrieve data for ID: ${id}`);
		}

		const data = await response.json();
		return [data.cipherText, data.dataToEncryptHash];
	} catch (e) {
		console.log("Error retrieving data ", e);
	}
}

async function storeOnIrys(cipherText, dataToEncryptHash) {
	const irys = await getIrys();

	const dataToUpload = {
		cipherText: cipherText,
		dataToEncryptHash: dataToEncryptHash,
	};

	let receipt;
	try {
		const tags = [{ name: "Content-Type", value: "application/json" }];
		receipt = await irys.upload(JSON.stringify(dataToUpload), { tags });
	} catch (e) {
		console.log("Error uploading data ", e);
	}

	return receipt?.id;
}

async function main() {
	const messageToEncrypt = "Irys + Lit is 🔥x2";

	// 1. Encrypt data
	const [cipherText, dataToEncryptHash] = await encryptData(messageToEncrypt);
	console.log("ciphertext=", cipherText);
	// 2. Store cipherText and dataToEncryptHash on Irys
	const encryptedDataID = await storeOnIrys(cipherText, dataToEncryptHash);

	console.log(`Data stored at https://gateway.irys.xyz/${encryptedDataID}`);

	// 3. Retrieve data stored on Irys
	// In real world applications, you could wait any amount of time before retrieving and decrypting
	const [cipherTextRetrieved, dataToEncryptHashRetrieved] = await retrieveFromIrys(encryptedDataID);
	// 4. Decrypt data
	const decryptedString = await decryptData(cipherTextRetrieved, dataToEncryptHashRetrieved);
	console.log("decryptedString:", decryptedString);
}

main();
