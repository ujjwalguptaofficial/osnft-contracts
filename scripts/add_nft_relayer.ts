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

    const relayerAddress = process.env.RELAYER_ADDRESS as string;

    let relayer = await contractInstance["relayer()"]();
    expect(relayer).equal(ethers.constants.AddressZero);

    const tx = await contractInstance["relayer(address)"](relayerAddress);
    await tx.wait();

    relayer = await contractInstance["relayer()"]();
    expect(relayer).equal(relayerAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
