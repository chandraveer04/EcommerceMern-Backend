# E-commerce MERN Application with Crypto Payments

A full-stack e-commerce application built with the MERN stack (MongoDB, Express.js, React, Node.js) and integrated with both Stripe and cryptocurrency payments using MetaMask.

## Features

- User authentication and authorization
- Product catalog with search and filtering
- Shopping cart functionality
- Coupon system
- Multiple payment options:
  - Credit/Debit cards via Stripe
  - Cryptocurrency payments via MetaMask
- Order tracking
- Responsive design

## Prerequisites

Before running the application, make sure you have the following installed:
- Node.js (v16 or higher)
- MongoDB
- Ganache (for local blockchain development)
- MetaMask browser extension

## Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd ecommerce-mern
```

2. Install dependencies for all components (backend, frontend, and blockchain):
```bash
npm run setup
```

3. Configure environment variables:
- Copy `.env.example` to `.env` in the root directory
- Copy `frontend/.env.example` to `frontend/.env`
- Update the environment variables with your values

4. Start Ganache:
- Open Ganache
- Create a new workspace
- Make sure it's running on port 7545

5. Deploy the smart contract:
```bash
npm run deploy:contract
```

6. Start the application (both frontend and backend):
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5174
- Backend API: http://localhost:5000

## Docker Deployment

You can also run the application using Docker:

### Prerequisites for Docker
- Docker
- Docker Compose

### Deployment Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd ecommerce-mern
```

2. Deploy with the provided script:
```bash
# On Linux/Mac
chmod +x docker-deploy.sh
./docker-deploy.sh

# On Windows
powershell -ExecutionPolicy Bypass -File .\docker-deploy.ps1
```

3. Access the application:
- Frontend: http://localhost
- Backend API: http://localhost:5000/api

### Manual Docker Deployment

1. Build and start containers:
```bash
docker-compose up -d --build
```

2. Deploy the smart contract (optional):
```bash
docker-compose exec backend npm run blockchain:deploy
```

For more detailed Docker instructions, see the [DOCKER-README.md](DOCKER-README.md) file.

## Available Scripts

- `npm run setup` - Install dependencies for all components
- `npm run dev` - Start both frontend and backend in development mode
- `npm run deploy:contract` - Deploy the smart contract to the local blockchain
- `npm run blockchain` - Open Truffle console for blockchain interaction
- `npm run client` - Start only the frontend
- `npm run server` - Start only the backend
- `npm run build` - Build the frontend for production

## Smart Contract Development

The smart contract is located in `blockchain/contracts/PaymentProcessor.sol`. To make changes:

1. Modify the contract code
2. Deploy the changes:
```bash
npm run deploy:contract
```
3. Update the contract address in both `.env` files

## Testing Crypto Payments

1. Connect MetaMask to Ganache:
   - Network Name: Ganache
   - RPC URL: http://127.0.0.1:7545
   - Chain ID: 1337
   - Currency Symbol: ETH

2. Import a Ganache account to MetaMask:
   - Copy a private key from Ganache
   - Import Account in MetaMask
   - Use the private key

3. Make a purchase:
   - Add items to cart
   - Proceed to checkout
   - Select "Crypto" payment method
   - Connect MetaMask when prompted
   - Confirm the transaction

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.
