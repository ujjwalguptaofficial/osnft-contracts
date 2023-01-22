import { ethers, upgrades } from "hardhat";
const { LedgerSigner } = require("@anders-t/ethers-ledger");

// import { LedgerSigner } from "@ethersproject/hardware-wallets";

async function main() {
    const ledger = new LedgerSigner(ethers.provider);
    const contract = await ethers.getContractFactory('MyToken');

    const contractFactory = contract.connect(ledger);

    const deployedContract = await upgrades.deployProxy(
        contractFactory, ["MyToken", "MT"], {
        initializer: 'initialize',
    });

    await deployedContract.deployed();

    console.log("Box deployed to:", deployedContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
