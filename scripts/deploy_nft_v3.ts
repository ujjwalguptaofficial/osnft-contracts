import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { getProjectId } from "../test/utils";
const { LedgerSigner } = require("@anders-t/ethers-ledger");


async function main() {
    const ledger = new LedgerSigner(ethers.provider);

    const osdAddress = process.env.OSD_ADDRESS;
    const approverAddress = process.env.APPROVER_ADDRESS;
    const nftAddress = process.env.NFT_ADDRESS as string;


    console.log("osdAddress", osdAddress);
    console.log("approverAddress", approverAddress);

    const contractV2 = await ethers.getContractFactory('OSNFTV3');

    const contractFactory = contractV2.connect(ledger);

    const deployedContract = await upgrades.upgradeProxy(
        nftAddress,
        contractFactory
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
