# Node.js Integration: Irys + Lit Protocol

This directory contains Node.js scripts that demonstrate the use of Lit Protocol for data encryption and decryption, combined with Irys for permanent onchain storage.

## Setup Instructions

1. **Rename the Environment File**

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then, add a PRIVATE_KEY to your .env file. This key will be used for signing uploads to Irys.

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

## **Scripts Overview**

- `scripts/lit-only.ts`:
Demonstrates the use of Lit Protocol for encryption and decryption.
No interaction with Irys; purely focuses on Lit's encryption capabilities.

- `scripts/irys-lit.ts:`
Shows how to use Lit Protocol in combination with Irys.
Encrypts data with Lit Protocol, stores it on Irys, retrieves it, and then decrypts it.
