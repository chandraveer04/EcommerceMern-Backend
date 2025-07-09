require('dotenv').config({ path: '../.env' });
// Only require HDWalletProvider when using networks that need it
let HDWalletProvider;
try {
  // Only load this library when needed for Sepolia/Mainnet
  if (process.env.NETWORK && process.env.NETWORK !== 'development') {
    HDWalletProvider = require('@truffle/hdwallet-provider');
  }
} catch (error) {
  console.warn('HDWalletProvider not available, only development network will be available');
}

module.exports = {
  contracts_build_directory: './build/contracts',
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*", // Match any network id
      gas: 5000000
    },
    // Add Sepolia network for testnet deployment
    sepolia: {
      provider: () => {
        if (!HDWalletProvider) {
          throw new Error("HDWalletProvider is required for Sepolia network. Install with: npm install @truffle/hdwallet-provider");
        }
        return new HDWalletProvider(
          process.env.BLOCKCHAIN_DEPLOYER_PRIVATE_KEY || '', 
          process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'
        );
      },
      network_id: 11155111, // Sepolia's network ID
      gas: 5500000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    // Add mainnet for production deployment (if needed)
    mainnet: {
      provider: () => {
        if (!HDWalletProvider) {
          throw new Error("HDWalletProvider is required for Mainnet deployment. Install with: npm install @truffle/hdwallet-provider");
        }
        return new HDWalletProvider(
          process.env.BLOCKCHAIN_DEPLOYER_PRIVATE_KEY || '', 
          process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY'
        );
      },
      network_id: 1, // Ethereum Mainnet
      gas: 5000000,
      gasPrice: 50000000000, // 50 gwei
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: false
    }
  },
  contracts_directory: './contracts/',
  compilers: {
    solc: {
      version: "0.8.13",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};
