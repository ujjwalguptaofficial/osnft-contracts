import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
const { LedgerSigner } = require("@anders-t/ethers-ledger");


async function main() {
    const ledger = new LedgerSigner(ethers.provider);

    const marketplaceAddress = process.env.MARKETPLACE_ADDRESS;
    const nftAddress = process.env.NFT_ADDRESS;

    const marketplaceContract = await ethers.getContractFactory('OSNFTMarketPlace');
    const marketplaceContractInstance = await marketplaceContract.attach(marketplaceAddress as string);

    let relayer = await marketplaceContractInstance["relayer()"]();
    expect(relayer).equal(ethers.constants.AddressZero);

    const nftContract = await ethers.getContractFactory('OSNFT');
    const nftContractInstance = await nftContract.attach(nftAddress as string);

    relayer = await nftContractInstance["relayer()"]();
    expect(relayer).equal(ethers.constants.AddressZero);

    const contract = await ethers.getContractFactory('OSNFTRelayer');


    const contractFactory = contract.connect(ledger);

    const deployedContract = await upgrades.deployProxy(
        contractFactory,
        [
            marketplaceAddress,
            nftAddress,
        ],
        {
            initializer: 'initialize'
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
