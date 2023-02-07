import { expect } from "chai";
import { ethers } from "hardhat";
const { LedgerSigner } = require("@anders-t/ethers-ledger");

// import { LedgerSigner } from "@ethersproject/hardware-wallets";

async function main() {
    const ledger = new LedgerSigner(ethers.provider);

    const osdAddress = process.env.OSD_ADDRESS;

    const contract = await ethers.getContractFactory('OSDCoin');

    const contractFactory = contract.connect(ledger);

    const osdContractInstance = await contractFactory.attach(osdAddress as string);

    const operatorAddress = process.env.NFT_ADDRESS as string;

    // to check allowance
    const anyAddress = "0xF0a7103a92fCC2e23600B40Fa5692857Db7E0F4F";

    let allowance = await osdContractInstance.allowance(anyAddress, operatorAddress);
    expect(allowance).equal(0);

    const tx = await osdContractInstance.addDefaultOperator(operatorAddress, {
        maxPriorityFeePerGas: 30000000000
    });
    await tx.wait();

    allowance = await osdContractInstance.allowance(anyAddress, operatorAddress);
    expect(allowance).equal(ethers.constants.MaxUint256);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
