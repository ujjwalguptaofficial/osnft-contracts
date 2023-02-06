import { expect } from "chai";
import { ethers } from "hardhat";
import { IDeployedPayload } from "../interfaces";

export function testRelayer(payload: IDeployedPayload) {

    it('deploy relayer', async () => {
        const osdCoin = await ethers.getContractFactory('OSNFTRelayer');

        const relayerContract = await osdCoin.deploy(
            payload.marketplace.address,
            payload.nft.address
        );
        payload.relayer = relayerContract;
    })

    it('gasestimate for deployment', async () => {
        const osdCoin = await ethers.getContractFactory('OSNFTRelayer');

        const deploymentData = osdCoin.getDeployTransaction(
            payload.marketplace.address,
            payload.nft.address
        );
        const estimatedGas = await ethers.provider.estimateGas({ data: deploymentData.data });

        expect(estimatedGas).equal(932467);
    })

}
