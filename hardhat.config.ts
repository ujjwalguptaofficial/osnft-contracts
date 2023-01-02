import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";

import "hardhat-gas-reporter";

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  gasReporter: {
    currency: 'MATIC',
    gasPrice: 41,
  }
};

export default config;
