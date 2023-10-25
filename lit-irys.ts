import * as LitJsSdk from "@lit-protocol/lit-node-client-nodejs";
import Irys from "@irys/sdk";
import { Wallet, utils } from "ethers";
import siwe from "siwe";
import dotenv from "dotenv";
dotenv.config();

type AuthSigType = {
	sig: string;
	derivedVia: string;
	signedMessage: string;
	address: string;
};

// Returns a configured Irys object
async function getIrys(): Promise<Irys> {
	const url = "https://devnet.irys.xyz";
	const providerUrl = "https://rpc-mumbai.maticvigil.com";
	const token = "matic";

	const irys = new Irys({
		url, // URL of the node you want to connect to
		token, // Token used for payment
		key: process.env.PRIVATE_KEY as string, // Private key
		config: { providerUrl }, // Optional provider URL, only required when using Devnet
	});
	return irys;
}

// Returns a configured Lit node object
async function getLitNodeClient(): Promise<LitJsSdk.LitNodeClientNodeJs> {
	// Initialize LitNodeClient
	const litNodeClient = new LitJsSdk.LitNodeClientNodeJs({
		alertWhenUnauthorized: false,
		litNetwork: "cayenne",
	});
	await litNodeClient.connect();

	return litNodeClient;
}

async function getAuthSig(): Promise<AuthSigType> {
	// Initialize the signer
	const wallet = new Wallet(process.env.PRIVATE_KEY as string);
	const address = utils.getAddress(await wallet.getAddress());

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
	const authSig: AuthSigType = {
		sig: signature,
		derivedVia: "web3.eth.personal.sign",
		signedMessage: messageToSign,
		address: address,
	};

	return authSig;
}

function getAccessControlConditions(): any[] {
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

async function encryptData(dataToEncrypt: string): Promise<[string, Uint8Array]> {
	const authSig = await getAuthSig();
	const accessControlConditions = getAccessControlConditions();
	const litNodeClient = await getLitNodeClient();

	// 1. Encryption
	const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
		{
			authSig,
			accessControlConditions,
			dataToEncrypt: dataToEncrypt,
			chain: "ethereum",
		},
		litNodeClient,
	);
	return [ciphertext, dataToEncryptHash];
}

async function decryptData(
	ciphertext: string,
	dataToEncryptHash: Uint8Array,
	accessControlConditions: any[],
): Promise<string> {
	const authSig = await getAuthSig();
	const litNodeClient = await getLitNodeClient();

	let decryptedString: string;

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
async function retrieveFromIrys(id: string): Promise<[string, Uint8Array, any[]]> {
	const gatewayAddress = "https://gateway.irys.xyz/";
	const url = `${gatewayAddress}${id}`;

	try {
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Failed to retrieve data for ID: ${id}`);
		}

		const data = await response.json();
		return [data.cipherText, data.dataToEncryptHash, data.accessControlConditions];
	} catch (e) {
		console.log("Error retrieving data ", e);
	}
}

async function storeOnIrys(cipherText: string, dataToEncryptHash: Uint8Array): Promise<string> {
	const irys = await getIrys();

	const dataToUpload = {
		cipherText: cipherText,
		dataToEncryptHash: dataToEncryptHash,
		accessControlConditions: getAccessControlConditions(),
	};

	let receipt;
	try {
		const tags = [{ name: "Content-Type", value: "application/json" }];
		receipt = await irys.upload(JSON.stringify(dataToUpload), { tags });
	} catch (e) {
		console.log("Error uploading data ", e);
	}

	return receipt?.id as string;
}

async function main(): Promise<void> {
	const messageToEncrypt = "Irys + Lit is 🔥x2";

	// 1. Encrypt data
	const [cipherText, dataToEncryptHash] = await encryptData(messageToEncrypt);

	// 2. Store cipherText and dataToEncryptHash on Irys
	const encryptedDataID = await storeOnIrys(cipherText, dataToEncryptHash);

	console.log(`Data stored at https://gateway.irys.xyz/${encryptedDataID}`);

	// 3. Retrieve data stored on Irys
	const [cipherTextRetrieved, dataToEncryptHashRetrieved, accessControlConditions] = await retrieveFromIrys(
		encryptedDataID,
	);

	// 4. Decrypt data
	const decryptedString = await decryptData(cipherTextRetrieved, dataToEncryptHashRetrieved, accessControlConditions);
	console.log("decryptedString:", decryptedString);
}

main();
