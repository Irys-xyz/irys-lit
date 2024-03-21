import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { ethers } from "ethers";
import siwe from "siwe";
import dotenv from "dotenv";
dotenv.config();

async function main() {
	// Initialize LitNodeClient
	const litNodeClient = new LitJsSdk.LitNodeClientNodeJs({
		alertWhenUnauthorized: false,
		litNetwork: "cayenne",
		debug: false, // Change to true when developer if you need verbose messages
	});
	await litNodeClient.connect();

	let nonce = litNodeClient.getLatestBlockhash();

	// Initialize the signer
	const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
	const address = ethers.getAddress(await wallet.getAddress());

	// Craft the SIWE message
	const domain = "localhost";
	const origin = "https://localhost/login";
	const statement = "This is a test statement.  You can put anything you want here.";

	// expiration time in ISO 8601 format.  This is 7 days in the future, calculated in milliseconds
	const expirationTime = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

	const siweMessage = new siwe.SiweMessage({
		domain,
		address: address,
		statement,
		uri: origin,
		version: "1",
		chainId: 1,
		nonce,
		expirationTime,
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

	// Define access control conditions
	const accessControlConditions = [
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

	// Encrypt
	const messageToEncrypt = "Irys + Lit is 🔥x2";
	const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
		{
			authSig,
			accessControlConditions,
			dataToEncrypt: messageToEncrypt,
			chain: "ethereum",
		},
		litNodeClient,
	);

	// Decrypt
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

	console.log(`Message decrypted ${decryptedString}`);
}

main();
