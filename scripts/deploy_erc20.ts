import { ethers, upgrades } from "hardhat";
const { LedgerSigner } = require("@anders-t/ethers-ledger");


async function main() {
    const ledger = new LedgerSigner(ethers.provider);

    const contract = await ethers.getContractFactory('MyToken');
    const contractFactory = contract.connect(ledger);

    const deployedContract = await contractFactory.deploy(
        {
            maxPriorityFeePerGas: 30000000000
        }
    );

    await deployedContract.deployed();

    console.log("Contract deployed to:", deployedContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
