# Node.js Integration: Irys + Lit Protocol

This directory contains Node.js scripts that demonstrate the use of Lit Protocol for data encryption and decryption, combined with Irys for  onchain storage.

## Setup

1. **Rename the Environment File**

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then, add a PRIVATE_KEY to your .env file. This key will be used for signing uploads to Irys and proving you meet decryption conditions. 

2. **Install Dependencies**

```bash
npm install
```

3. **Run the Scripts**

- Lit Only Encryption/Decryption:
  This script demonstrates using Lit Protocol to encrypt a string and then immediately decrypt it:

```bash
ts-node scripts/lit-only.ts
```

- Irys + Lit Integration:
  This script encrypts a string using Lit Protocol, stores it on Irys, retrieves it from Irys, and then decrypts it:

```bash
ts-node scripts/irys-lit.ts
```
