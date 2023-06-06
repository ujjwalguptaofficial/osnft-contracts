import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";
// import "@graphprotocol/hardhat-graph";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000000,
      },
    },
  },
  defaultNetwork: "localhost",
  networks: {
    localhost: {
      url: "http://0.0.0.0:8545",
    },
    mumbai: {
      url: `https://rpc.ankr.com/polygon_mumbai`,
      chainId: 80001,
    },
    polygon: {
      url: `https://polygon-rpc.com`,
      chainId: 137,
    },
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY,
  },
  contractSizer: {
    runOnCompile: true,
  },
};

export default config;
