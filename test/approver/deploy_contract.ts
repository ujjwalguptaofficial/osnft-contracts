import { ethers, upgrades } from "hardhat";
import { IDeployedPayload } from "../interfaces";

export async function deployApprover(payload: IDeployedPayload) {
    const approverContract = await ethers.getContractFactory('OSNFTApprover');

    const deployedApproverContract = await upgrades.deployProxy(approverContract, [], {
        initializer: 'initialize',
    }) as any;
    payload.approver = deployedApproverContract;
}