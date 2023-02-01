import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { getProjectId } from "../test/utils";
const { LedgerSigner } = require("@anders-t/ethers-ledger");


async function main() {
    const ledger = new LedgerSigner(ethers.provider);

    const marketplaceAddress = process.env.MARKETPLACE_ADDRESS;
    const nftAddress = process.env.NFT_ADDRESS;

    const marketplaceContract = await ethers.getContractFactory('OSNFTMarketPlace');
    const marketplaceContractFactory = await marketplaceContract.connect(ledger);

    const marketplaceContractInstance = await marketplaceContractFactory.attach(marketplaceAddress as string);

    let isAuctionOpen = await marketplaceContractInstance.isAuctionOpen(
        getProjectId("github.com/ujjwalguptaofficial/jsstore-examples")
    );
    expect(isAuctionOpen).equal(false);

    const nftContract = await ethers.getContractFactory('OSNFT');
    const nftContractFactory = await nftContract.connect(ledger);
    const nftContractInstance = await nftContractFactory.attach(nftAddress as string);

    const nftName = await nftContractInstance.name();
    expect(nftName).equal('OpenSourceNFT');

    console.log("all verified");

    const contract = await ethers.getContractFactory('OSNFTRelayer');
    const contractFactory = contract.connect(ledger);

    const deployedContract = await contractFactory.deploy(

        marketplaceAddress as string,
        nftAddress as string,
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
