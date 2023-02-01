import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
const { LedgerSigner } = require("@anders-t/ethers-ledger");

// import { LedgerSigner } from "@ethersproject/hardware-wallets";

async function main() {
    const ledger = new LedgerSigner(ethers.provider);

    const nftAddress = process.env.NFT_ADDRESS;

    const contract = await ethers.getContractFactory('OSNFT');

    const contractFactory = contract.connect(ledger);

    const contractInstance = await contractFactory.attach(nftAddress as string);

    const marketplaceAddress = process.env.MARKETPLACE_ADDRESS as string;

    let defaultMarketplace = await contractInstance["defaultMarketPlace()"]();
    expect(defaultMarketplace).equal(ethers.constants.AddressZero);


    let isApprovedForAll = await contractInstance["isApprovedForAll"](
        "0x0FA4EA6F5A540BA18c477087007098AF954048Be",
        marketplaceAddress
    );

    console.log("isApprovedForAll", isApprovedForAll)

    return;


    console.log("defaultMarketplace", defaultMarketplace);

    const tx = await contractInstance["defaultMarketPlace(address)"](marketplaceAddress, {
        maxPriorityFeePerGas: 30000000000
    });
    await tx.wait();

    defaultMarketplace = await contractInstance["relayer()"]();
    expect(defaultMarketplace).equal(marketplaceAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
