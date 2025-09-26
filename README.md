# zeropaste - A Zero-Knowledge Pastebin

A simple but sleek **encrypted pastebin** built with **Next.js** with the zero-knowledge principle.
All encryption and decryption happens client-side and the server never sees keys and plaintext.

Currently supported encryption methods are AES-GCM-256 or PBKDF2-SHA256 using passphrases.

## Self Hosting this application

### Clone and install

```bash
git clone https://github.com/davidhepp/zeropaste
cd zeropaste
npm install
```

### Setup Prisma and SQLite

```bash
npx prisma migrate dev -n init
```

### Run the dev server

```bash
npm run dev
```

The app is now running at `http://localhost:3000`
