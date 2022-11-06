import { expect } from "chai";
import { constants } from "ethers";
import { ethers } from "hardhat";
import { IDeployedPayload } from "./interfaces";

export function testApprove(payload: IDeployedPayload) {

    it('approve to all', async () => {
        let isApprovedForAll = await payload.nft.isApprovedForAll(payload.deployer.address, payload.operator.address);
        expect(isApprovedForAll).equal(false);

        const tx = payload.nft.setApprovalForAll(payload.operator.address, true);
        await expect(tx).to.emit(payload.nft, "ApprovalForAll").withArgs(
            payload.deployer.address,
            payload.operator.address,
            true
        );

        isApprovedForAll = await payload.nft.isApprovedForAll(payload.deployer.address, payload.operator.address);
        expect(isApprovedForAll).equal(true);

        // check for others

        isApprovedForAll = await payload.nft.isApprovedForAll(payload.signer2.address, payload.operator.address);
        expect(isApprovedForAll).equal(false);

        isApprovedForAll = await payload.nft.isApprovedForAll(payload.signer3.address, payload.operator.address);
        expect(isApprovedForAll).equal(false);

        isApprovedForAll = await payload.nft.isApprovedForAll(payload.operator.address, payload.operator.address);
        expect(isApprovedForAll).equal(false);

    })

    it('approve a token by not token owner', async () => {
        const projectUrl = payload.projects["jsstore-example"];
        const expectedTokenId = payload.getProjectId(projectUrl);

        const owner = await payload.nft.ownerOf(expectedTokenId);

        const tx = payload.nft.connect(payload.signer2)["approve(address,bytes32)"](
            payload.signer3.address,
            expectedTokenId
        );

        await expect(tx).to.revertedWith('ERC721: approve caller is not token owner nor approved for all')
    })

    it('approve mahal to signer3', async () => {
        const projectUrl = payload.projects.mahal;
        const expectedTokenId = payload.getProjectId(projectUrl);

        let approvedAddress = await payload.nft["getApproved(bytes32)"](expectedTokenId);
        expect(approvedAddress).equal(constants.AddressZero);


        const owner = await payload.nft.ownerOf(expectedTokenId);
        expect(owner).equal(payload.signer2.address);

        const tx = payload.nft.connect(payload.signer2)["approve(address,bytes32,address)"](
            payload.signer3.address,
            expectedTokenId,
            payload.signer2.address
        );
        await expect(tx).to.emit(payload.nft, "Approval").withArgs(
            owner,
            payload.signer3.address,
            expectedTokenId
        );

        approvedAddress = await payload.nft["getApproved(bytes32,address)"](expectedTokenId, owner);
        expect(approvedAddress).equal(payload.signer3.address);
    })

    it('approve jsstore to signer4', async () => {
        const projectUrl = payload.projects.jsstore;
        const expectedTokenId = payload.getProjectId(projectUrl);

        let approvedAddress = await payload.nft["getApproved(bytes32)"](expectedTokenId);
        expect(approvedAddress).equal(constants.AddressZero);


        const owner = await payload.nft.ownerOf(expectedTokenId);

        const tx = payload.nft["approve(address,bytes32,address)"](
            payload.signer4.address,
            expectedTokenId,
            payload.deployer.address
        );
        await expect(tx).to.emit(payload.nft, "Approval").withArgs(
            owner,
            payload.signer4.address,
            expectedTokenId
        );

        approvedAddress = await payload.nft["getApproved(bytes32,address)"](expectedTokenId, owner);
        expect(approvedAddress).equal(payload.signer4.address);

        const approvedValueWithoutShare = await payload.nft["getApproved(bytes32)"](expectedTokenId);
        expect(approvedValueWithoutShare).equal(ethers.constants.AddressZero);

    })
}