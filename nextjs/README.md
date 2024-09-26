# Next.js Integration: Irys + Lit Protocol

This directory contains a Next.js application that demonstrates the use of Lit Protocol for data encryption and decryption, combined with Irys for permanent onchain storage. This application uses RainbowKit for wallet connection.

## Prerequisites

- **WalletConnect Project ID:**  
  Every dApp that relies on WalletConnect must obtain a `projectId` from [WalletConnect Cloud](https://cloud.walletconnect.com/). This is free and only takes a few minutes.

- **Environment Setup:**  
  Rename `.env.local.example` to `.env.local` and set your `NEXT_PUBLIC_WALLET_CONNECT_ID`:

```bash
cp .env.local.example .env.local
```

Update .env.local:

```bash
NEXT_PUBLIC_WALLET_CONNECT_ID=<your_project_id>
```


## Installation

```bash
npm install
```

## Run the Development Server

```bash
npm run dev
```

## Use

This app guides users through a step-by-step process:

  1. Connect Wallet: Users connect their wallets via RainbowKit.
  2. Encrypt Data: Users enter text to be encrypted with Lit Protocol.
  3. Upload to Irys: Encrypted data is uploaded to Irys for permanent onchain storage.
  4. Download from Irys: Retrieves the encrypted data from Irys.
  5. Decrypt Data: Decrypts the retrieved data using Lit Protocol.
