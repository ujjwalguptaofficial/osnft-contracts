import { expect } from "chai";
import { ethers } from "hardhat";
import { IDeployedPayload } from "../interfaces";

export function testRelayer(payload: IDeployedPayload) {

    it('deploy relayer', async () => {
        const osdCoin = await ethers.getContractFactory('OSDRelayer');
        const relayerContract = await osdCoin.deploy(payload.marketplace.address);
        payload.relayer = relayerContract;
    })
}
