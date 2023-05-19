import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { IDeployedPayload } from "../interfaces";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";


export function testApproval(payload: IDeployedPayload) {

    it('check isApproval', async () => {
        const nft = payload.nft;
        const isApproval = await nft.isApprovedForAll(payload.deployer.address, payload.operator.address);
        expect(isApproval).equal(false);
    })

    it('check isApproval for self', async () => {
        const nft = payload.nft;
        const isApproval = await nft.isApprovedForAll(payload.deployer.address, payload.deployer.address);
        expect(isApproval).equal(false);
    })

    it('approve for all and check isApproval', async () => {
        const nft = payload.nft;
        const tx = nft.setApprovalForAll(payload.operator.address, true);
        await expect(tx).emit(nft, "ApprovalForAll").withArgs(
            payload.deployer.address,
            payload.operator.address,
            true
        );
        const isApproval = await nft.isApprovedForAll(payload.deployer.address, payload.operator.address);
        expect(isApproval).equal(true);
    })
}