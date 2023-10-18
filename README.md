# Encrypting on-chain data

Data uploaded to Irys is stored permanently on Arweave. Once on Arweave, this data becomes publicly accessible, anyone can view or retrieve it. This repository teaches you how to:

-   Encrypt data before storing it on-chain
-   Establish a set of rules determining who can decrypt the data

## Technology

-   [Irys](https://docs.irys.xyz/) for uploading data
-   [Lit v3](https://developer.litprotocol.com/v3/) for encrypting and decrypting data

## Steps

1. Encrpt message using Auth keys (managed by Lit)
2. Sign the encrypted message with my private key
