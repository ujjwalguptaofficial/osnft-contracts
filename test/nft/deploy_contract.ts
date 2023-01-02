import { ethers, upgrades } from "hardhat";
import { IDeployedPayload } from "../interfaces";

export async function deployNFTContract(payload: IDeployedPayload) {
    console.log('native token', payload.nativeToken.address);

    const ct = await ethers.getContractFactory('OSNFT');

    const deployedContract = await upgrades.deployProxy(ct, [
        'OpenSourceNFT',
        'OSNFT',
        'https://ujjwalnft.com/metadata/',
        payload.approver.address,
        payload.nativeToken.address
    ], {
        initializer: 'initialize',
    });

    await deployedContract.deployed();

    payload.nft = deployedContract as any;

    console.log('nft deployed');
}