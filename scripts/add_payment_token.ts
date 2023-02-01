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

    const tokenAddress = "0xe1b183ff79AD9b41AE05F4ae6026d8d8B8A04B50";

    let isPayableToken = await contractInstance.isPayableToken(tokenAddress);
    expect(isPayableToken).equal(false);

    console.log("payable", isPayableToken);

    const tx = await contractInstance.addPayableToken(tokenAddress, {
        maxPriorityFeePerGas: 30000000000
    });
    await tx.wait();
    // wait for 10 sec to reflect the data
    await new Promise((res) => {
        setTimeout(res, 10000);
    })

    isPayableToken = await contractInstance.isPayableToken(tokenAddress);
    expect(isPayableToken).equal(true);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
