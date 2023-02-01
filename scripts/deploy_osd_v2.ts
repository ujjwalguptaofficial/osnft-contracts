import { ethers, upgrades } from "hardhat";
const { LedgerSigner } = require("@anders-t/ethers-ledger");

// import { LedgerSigner } from "@ethersproject/hardware-wallets";

async function main() {
    const ledger = new LedgerSigner(ethers.provider);
    const contract = await ethers.getContractFactory('OSDCoinV2');
    const osdAddress = process.env.OSD_ADDRESS as string;

    const contractFactory = contract.connect(ledger);

    const deployedContract = await upgrades.upgradeProxy(osdAddress, contractFactory);

    await deployedContract.deployed();

    console.log("Contract deployed to:", deployedContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
