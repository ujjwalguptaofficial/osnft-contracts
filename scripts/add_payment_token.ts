import { expect } from "chai";
import { ethers } from "hardhat";
const { LedgerSigner } = require("@anders-t/ethers-ledger");

// import { LedgerSigner } from "@ethersproject/hardware-wallets";

async function main() {
    const ledger = new LedgerSigner(ethers.provider);

    const marketplaceAddress = process.env.MARKETPLACE_ADDRESS;

    const contract = await ethers.getContractFactory('OSNFTMarketPlace');

    const contractFactory = contract.connect(ledger);

    const contractInstance = await contractFactory.attach(marketplaceAddress as string);

    const tokenAddress = "0xae740d42e4ff0c5086b2b5b5d149eb2f9e1a754f";

    let isPayableToken = await contractInstance.isPayableToken(tokenAddress);
    expect(isPayableToken).equal(false);

    const tx = await contractInstance.addPayableToken(tokenAddress, {
        maxPriorityFeePerGas: 30000000000
    });
    await tx.wait();

    isPayableToken = await contractInstance.isPayableToken(tokenAddress);
    expect(isPayableToken).equal(true);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
