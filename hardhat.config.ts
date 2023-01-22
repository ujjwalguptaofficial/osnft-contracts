import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 2000,
      }
    }
  },
  gasReporter: {
    currency: 'MATIC',
    gasPrice: 41,
  },
  defaultNetwork: "hardhat",
  networks: {
    mumbai: {
      url: `https://rpc.ankr.com/polygon_mumbai`,
      chainId: 80001,
    },
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY
  }
};

task("deploy:contracts", "Deploy all contracts").setAction(async (taskArgs, hre) => {
  // const payload = {

  // } as IDeployedPayload;

  // // await deployApprover(payload);

  // // deployNFTContract(payload);

  // execSync('hardhat test', { stdio: 'inherit' });


});

export default config;
