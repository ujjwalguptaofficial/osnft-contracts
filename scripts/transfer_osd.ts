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
    // const addressOfSigner = osdContractFactory.signer.getAddress();

    const addressToTransfer = "0xF0a7103a92fCC2e23600B40Fa5692857Db7E0F4F";

    let balanceOfUser = await osdContractInstance.balanceOf(addressToTransfer);
    expect(balanceOfUser).equal(0);

    const oneThousand = ethers.utils.parseEther('10000');


    const promise = await osdContractInstance.transfer(addressToTransfer, oneThousand);
    await promise.wait();
    balanceOfUser = await osdContractInstance.balanceOf(addressToTransfer);
    expect(balanceOfUser).equal(oneThousand);



}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
