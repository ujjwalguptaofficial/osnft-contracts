import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { getProjectId } from "../test/utils";
const { LedgerSigner } = require("@anders-t/ethers-ledger");


async function main() {
    const ledger = new LedgerSigner(ethers.provider);

    const osdAddress = process.env.OSD_ADDRESS;
    const approverAddress = process.env.APPROVER_ADDRESS;

    console.log("osdAddress", osdAddress);
    console.log("approverAddress", approverAddress);

    const osdContract = await ethers.getContractFactory('OSDCoin');
    const osdContractFactory = await osdContract.connect(ledger);
    const osdContractInstance = await osdContractFactory.attach(osdAddress as string);

    let name = await osdContractInstance.name();
    expect(name).equal('OpenSourceDevCoin');

    const approverContract = await ethers.getContractFactory('OSNFTApprover');
    const approverContractFactory = await approverContract.connect(ledger);
    const approverContractInstance = await approverContractFactory.attach(approverAddress as string);

    const approvedProject = await approverContractInstance.getApprovedProject(
        getProjectId("github.com/ujjwalguptaofficial/jsstore-examples")
    );
    expect(approvedProject.worth).greaterThanOrEqual(0);

    console.log("all verified");

    const contract = await ethers.getContractFactory('OSNFT');


    const contractFactory = contract.connect(ledger);

    const deployedContract = await upgrades.deployProxy(
        contractFactory,
        [
            'OpenSourceNFT',
            'OSNFT',
            'https://osnft.app/metadata/',
            approverAddress,
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
