import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
const { LedgerSigner } = require("@anders-t/ethers-ledger");


async function main() {
    const ledger = new LedgerSigner(ethers.provider);

    const osdAddress = process.env.OSD_ADDRESS;
    const nftAddress = process.env.NFT_ADDRESS;

    console.log("osdAddress", osdAddress);
    console.log("nftAddress", nftAddress);

    const osdContract = await ethers.getContractFactory('OSDCoin');
    const osdContractFactory = await osdContract.connect(ledger);
    const osdContractInstance = await osdContractFactory.attach(osdAddress as string);

    let name = await osdContractInstance.name();
    expect(name).equal('OpenSourceDevCoin');

    const nftContract = await ethers.getContractFactory('OSNFT');
    const nftContractFactory = await nftContract.connect(ledger);
    const nftContractInstance = await nftContractFactory.attach(nftAddress as string);

    const nftName = await nftContractInstance.name();
    expect(nftName).equal('OpenSourceNFT');

    console.log("all verified");

    const contract = await ethers.getContractFactory('OSNFTMarketPlace');


    const contractFactory = contract.connect(ledger);

    const deployedContract = await upgrades.deployProxy(
        contractFactory,
        [
            nftAddress,
            osdAddress
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
