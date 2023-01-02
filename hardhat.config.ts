import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: process.env.NODE_ENV === 'production' ? {
        enabled: true,
        runs: 1000,
      } : {},
    }
  },
  gasReporter: {
    currency: 'MATIC',
    gasPrice: 41,
  },

};

export default config;
