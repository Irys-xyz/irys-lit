import * as LitJsSdk from "@lit-protocol/lit-node-client-nodejs";

import ethers from "ethers";
import siwe from "siwe";
import dotenv from "dotenv";
dotenv.config();

const statementToEncrypt = "Irys + Lit to the moon.";
const chain = "ethereum";

async function main() {
	// Initialize LitNodeClient
	const litNodeClient = new LitJsSdk.LitNodeClientNodeJs({
		alertWhenUnauthorized: false,
		litNetwork: "cayenne",
	});
	await litNodeClient.connect();

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
	// This defines who can decrypt the data
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

	const messageToEncrypt = "Irys + Lit is 🔥x2";

	// 1. Encryption
	// <Blob> encryptedString
	// <Uint8Array(32)> dataToEncryptHash
	const { ciphertext, dataToEncryptHash} = await LitJsSdk.encryptString({
        authSig,
        accessControlConditions,
        dataToEncrypt: messageToEncrypt,
        chain: 'ethereum',
    }, litNodeClient);

	// 2. Decrypt it
	// <String> toDecrypt
	// <Uint8Array(32)> dataToEncryptHash
	let decryptedString;

    try{
        decryptedString = await LitJsSdk.decryptToString(
            {
            authSig,
            accessControlConditions,
            ciphertext,
            dataToEncryptHash,
            chain: 'ethereum',
            }, litNodeClient
        );
    }catch(e){
        console.log(e);
    }

	console.warn("decryptedString:", decryptedString);
}

main();
