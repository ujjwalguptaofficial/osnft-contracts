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

    const tokenAddress = "0x91CfF5eC3086Ae4d0aBADaBdCC9F11d1b11975F8";

    let isPayableToken = await contractInstance.isPayableToken(tokenAddress);
    expect(isPayableToken).equal(false);

    const tx = await contractInstance.addPayableToken(tokenAddress);
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
