![](./assets/irys-encrypting-lit.png)

# Encrypting on-chain data

Data uploaded to Irys is stored permanently on Arweave. Once on Arweave, this data becomes publicly accessible, anyone can view or retrieve it. For projects where privacy is a concern, you can use [LitProtocol](https://litprotocol.com/) to encrypt data before storing it on Irys.

This repository teaches you how to:

-   Encrypt data before storing it on-chain
-   Establish a set of rules determining who can decrypt the data
-   Decrypt data

## Technology

-   [Irys](https://docs.irys.xyz/) for uploading data
-   [Lit v3](https://developer.litprotocol.com/v3/) for encrypting and decrypting data

## Steps

1. Encrypt data
    1. Obtain a wallet signature ([`AuthSig`](https://developer.litprotocol.com/v3/sdk/authentication/overview#obtain-an-authsig)), which proves you own a wallet
    2. Define [access control conditions](https://developer.litprotocol.com/v3/sdk/access-control/intro) for who can decrypt your data
    3. Connect to a Lit node and request that it encrypt your data
2. Store encrypted data on Irys
3. Retrieve encrypted data from Irys
4. Decrypt data
    1. Obtain a wallet signature ([`AuthSig`](https://developer.litprotocol.com/v3/sdk/authentication/overview#obtain-an-authsig)), which proves you own a wallet
    2. Connect to a Lit node and request that it decrypt your data

## Access control conditions

Lit Protocol enables users to set [access control conditions](https://developer.litprotocol.com/v3/sdk/access-control/intro) specifying who can decrypt data. This provides builders with the flexibility to designate data decryption permissions based on:

-   A single wallet address
-   DAO membership
-   Owners of an ERC20 or ERC721
-   Outcomes from a smart contract call
-   Outcomes from an API call.

To ensure anyone can run the code in this repository, it uses the following for access control, allowing anyone with an ETH balance >= 0 to decrypt.

```ts
const accessControlConditions = [
	{
		contractAddress: "",
		standardContractType: "",
		chain: "ethereum",
		method: "eth_getBalance",
		parameters: [":userAddress", "latest"],
		returnValueTest: {
			comparator: ">=",
			value: "0", // 0 ETH, so anyone can decrypt
		},
	},
];
```

## Installation

1. Clone this repository
2. Rename `.env.example` to `.env` and add a private key
3. `cd irys-lit`
4. `yarn`

> Install with yarn only. There is currently a bug in the npm install script, it will be fixed soon

## Running

1. `yarn dev`
