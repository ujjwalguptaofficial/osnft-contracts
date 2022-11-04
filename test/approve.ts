import { expect } from "chai";
import { IDeployedPayload } from "./interfaces";

export function testApprove(payload: IDeployedPayload) {

    it('approve to all', async () => {
        const tx = payload.nft.setApprovalForAll(payload.operator.address, true);
        await expect(tx).to.emit(payload.nft, "ApprovalForAll").withArgs(
            payload.deployer.address,
            payload.operator.address,
            true
        );
    })

    it('approve mahal to deployer', async () => {
        const projectUrl = payload.projects.mahal;
        const expectedTokenId = payload.getProjectId(projectUrl);

        const owner = await payload.nft.ownerOf(expectedTokenId);

        const tx = payload.nft.connect(payload.signer2).approve(
            payload.signer3.address,
            expectedTokenId
        );
        await expect(tx).to.emit(payload.nft, "Approval").withArgs(
            owner,
            payload.signer3.address,
            expectedTokenId
        );
    })
}