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

    const tokenAddresses = ['0xa1c57f48f0deb89f569dfbe6e2b7f46d33606fd4', '0xbbba073c31bf03b8acf7c28ef0738decf3695683', '0x2e1ad108ff1d8c782fcbbb89aad783ac49586756', '0xe1b183ff79ad9b41ae05f4ae6026d8d8b8a04b50']
    
    let results = await Promise.all(
        tokenAddresses.map(tokenAddress => {
            return contractInstance.isPayableToken(tokenAddress);
        })
    );

    results.forEach((isPayableToken, index) => {
        console.log("payable", isPayableToken, index);
        expect(isPayableToken).equal(false);
    });

    const tx = await contractInstance.addPayableTokens(tokenAddresses, {
        maxPriorityFeePerGas: 30000000000
    });
    await tx.wait();
    // wait for 10 sec to reflect the data
    await new Promise((res) => {
        setTimeout(res, 10000);
    })

    results = await Promise.all(
        tokenAddresses.map(tokenAddress => {
            return contractInstance.isPayableToken(tokenAddress);
        })
    );

    results.forEach((isPayableToken, index) => {
        console.log("payable", isPayableToken, index);
        expect(isPayableToken).equal(true);
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
