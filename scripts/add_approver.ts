import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
const { LedgerSigner } = require("@anders-t/ethers-ledger");

// import { LedgerSigner } from "@ethersproject/hardware-wallets";

async function main() {
    const ledger = new LedgerSigner(ethers.provider);

    const approverAddress = process.env.APPROVER_ADDRESS;

    const contract = await ethers.getContractFactory('OSNFTApprover');

    const contractFactory = contract.connect(ledger);

    const osdContractInstance = await contractFactory.attach(approverAddress as string);

    const addressToApprover = process.env.NFT_ADDRESS as string;
    // const addressToApprover = "0xF0a7103a92fCC2e23600B40Fa5692857Db7E0F4F";

    let isAprover = await osdContractInstance.isApprover(addressToApprover);
    expect(isAprover).equal(false);

    const tx = await osdContractInstance.addApprover(addressToApprover);
    await tx.wait();

    isAprover = await osdContractInstance.isApprover(addressToApprover);
    expect(isAprover).equal(true);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
