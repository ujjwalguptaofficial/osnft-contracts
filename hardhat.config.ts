import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import { execSync } from "child_process";
import { deployNFTContract } from "./test/nft/deploy_contract";
import { IDeployedPayload } from "./test/interfaces";
import { deployApprover } from "./test/approver/deploy_contract";

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
  defaultNetwork: "hardhat"
};

task("deploy:contracts", "Deploy all contracts").setAction(async (taskArgs, hre) => {
  const payload = {

  } as IDeployedPayload;

  // await deployApprover(payload);

  // deployNFTContract(payload);

  execSync('hardhat test', { stdio: 'inherit' });


});

export default config;
