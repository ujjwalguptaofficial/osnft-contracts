import { ethers, upgrades } from "hardhat";
const { LedgerSigner } = require("@anders-t/ethers-ledger");
import { expect } from "chai";
// import { LedgerSigner } from "@ethersproject/hardware-wallets";

async function main() {
    const ledger = new LedgerSigner(ethers.provider);

    const osnftMetaAddress = process.env.OSNFT_META;
    if (!osnftMetaAddress) throw "no osnft meta found";

    const contractOSNFTMeta = await ethers.getContractFactory('OSNFTMeta');
    const contractFactoryOsNftMeta = contractOSNFTMeta.connect(ledger);

    const ctOSNFTMeta = contractFactoryOsNftMeta.attach(osnftMetaAddress);

    const isPayableToken = await ctOSNFTMeta.isPayableToken(ethers.constants.AddressZero);

    expect(isPayableToken).equal(false);

    const contract = await ethers.getContractFactory('OSNFT');
    const contractFactory = contract.connect(ledger);

    const deployedContract = await upgrades.deployProxy(
        contractFactory,
        [
            "https://osnft.app/project",
            osnftMetaAddress

        ],
        {
            initializer: 'initialize',
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
