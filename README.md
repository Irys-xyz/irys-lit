# Irys + Lit Protocol Overview

Use [Lit Protocol](https://www.litprotocol.com/) with [Irys](https://docs.irys.xyz) to securely encrypt and manage your onchain data.

## Irys + Lit Use Cases

Using Lit Protocol with Irys opens up new opportunities for builders, including:

- Gating access to content
- Storing and securing private [DePIN data](https://docs.irys.xyz/build/d/guides/depin-data)
- Securely archiving sensitive [AI data](https://docs.irys.xyz/build/d/guides/ai-prompts)
- Encrypted content for decentralized social apps
- Decentralized identity verification
- Creating private data marketplaces
- Creating exclusive NFTs 

## Docs

https://docs.irys.xyz/build/d/guides/encrypting-with-lit

## Sub-Repositories

This repository includes the following sub-repositories:

- **[Node.js](./nodejs/README.md):** Irys + Lit with Node.js
  - Scripts:
    - `lit-only.ts` - Encrypts a string with Lit Protocol and immediately decrypts it.
    - `irys-lit.ts` - Encrypts a string with Lit Protocol, stores it on Irys, and then retrieves it.

- **[Next.js](./nextjs/README.md):** Irys + Lit with Next.js
  - Features:
    - Wallet connection using RainbowKit.
    - Integration of Lit Protocol for data encryption.
    - Upload and retrieval of encrypted data using Irys.

Each subdirectory includes its own README with setup instructions and usage details.
