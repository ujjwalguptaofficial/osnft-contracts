import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
const { LedgerSigner } = require("@anders-t/ethers-ledger");

// import { LedgerSigner } from "@ethersproject/hardware-wallets";

async function main() {
    const ledger = new LedgerSigner(ethers.provider);
    const osdAddress = process.env.OSD_ADDRESS;

    const contract = await ethers.getContractFactory('OSDCoin');
    const osdContractFactory = await contract.connect(ledger);
    const osdContractInstance = await osdContractFactory.attach(osdAddress as string);
    const addressOfSigner = osdContractFactory.signer.getAddress();
    let balanceOfUser = await osdContractInstance.balanceOf(addressOfSigner);
    expect(balanceOfUser).equal(0);

    const oneBillion = ethers.utils.parseEther('1000000000');

    console.log("oneBillion", oneBillion);

    const promise = await osdContractInstance.mint(addressOfSigner, oneBillion);
    await promise.wait();
    balanceOfUser = await osdContractInstance.balanceOf(addressOfSigner);
    expect(balanceOfUser).equal(oneBillion);



}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
