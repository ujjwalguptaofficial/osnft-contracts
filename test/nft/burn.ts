import { expect } from "chai";
import { constants } from "ethers";
import { IDeployedPayload } from "../interfaces";

export function testNFTBurn(payload: IDeployedPayload) {

    it('require token exist', async () => {
        const nft = payload.nft;
        const projectId = payload.getProjectId(payload.projects["solidity-tip"]);
        const from = payload.deployer.address;
        const tx = nft.burn(projectId);

        await expect(tx).to.revertedWith('ERC721: invalid token ID');
    })

    describe('not by owner', () => {
        it('percentage cut', async () => {
            const nft = payload.nft;
            const projectId = payload.getProjectId(payload.projects["mahal-webpack-loader"]);
            const from = payload.deployer.address;
            const tx = nft.burn(projectId);

            await expect(tx).to.revertedWith('Only owner can burn');
        })

        it('by partial owner', async () => {
            const nft = payload.nft;
            const from = payload.deployer.address;

            const projectId = payload.getProjectId(payload.projects["jsstore"]);

            const shareOf = await nft.shareOf(
                projectId, from
            )

            const totalShare = await nft.totalShareOf(projectId);

            console.log("totalShare", totalShare, shareOf);

            expect(shareOf).greaterThan(0);
            expect(totalShare).greaterThan(0);

            expect(shareOf).lessThan(totalShare);

            const tx = nft.burn(projectId);

            await expect(tx).to.revertedWith('Only owner can burn');
        })
    })


    describe('burn success', () => {
        it('share tokens', async () => {
            const nft = payload.nft;

            const projectId = payload.getProjectId(payload.projects["solidity-learning"]);
            const from = payload.deployer.address;

            const balanceofFrom = await nft.balanceOf(from);
            const shareOf = await nft.shareOf(
                projectId, from
            )

            expect(shareOf).greaterThan(0);
            const nativeToken = payload.nativeToken;
            const balanceOfOSD = await nativeToken.balanceOf(from);

            const tx = await nft.burn(projectId);

            await expect(tx).to.emit(nft, 'Transfer').withArgs(
                from,
                constants.AddressZero,
                projectId
            )

            const balanceofFromAfter = await nft.balanceOf(from);

            expect(balanceofFromAfter).equal(
                balanceofFrom.sub(1)
            )

            const shareOfAfter = nft.shareOf(
                projectId, from
            )

            await expect(shareOfAfter).to.revertedWith(`ERC721: invalid token ID`);

            const balanceOfOSDAfter = await nativeToken.balanceOf(from);
            const approvedProject = await payload.approver.getApprovedProject(projectId);
            expect(balanceOfOSDAfter).equal(
                balanceOfOSD.sub(
                    approvedProject.worth
                )
            );
        })

        it('percentagecut tokens', async () => {
            const nft = payload.nft.connect(payload.signer4);
            const projectId = payload.getProjectId(payload.projects["godam-vue"]);
            const from = payload.signer4.address;

            const balanceofFrom = await nft.balanceOf(from);
            const creatorCut = await nft.creatorCut(
                projectId
            );

            expect(creatorCut).greaterThan(0);

            const nativeToken = payload.nativeToken;
            const balanceOfOSD = await nativeToken.balanceOf(from);

            const tx = await nft.burn(projectId);

            await expect(tx).to.emit(nft, 'Transfer').withArgs(
                from,
                constants.AddressZero,
                projectId
            )

            const balanceofFromAfter = await nft.balanceOf(from);

            expect(balanceofFromAfter).equal(
                balanceofFrom.sub(1)
            )

            const creatorCutAfter = nft.creatorCut(
                projectId
            )

            await expect(creatorCutAfter).to.revertedWith(`ERC721: invalid token ID`);

            const balanceOfOSDAfter = await nativeToken.balanceOf(from);
            const approvedProject = await payload.approver.getApprovedProject(projectId);
            expect(balanceOfOSDAfter).equal(
                balanceOfOSD.sub(
                    approvedProject.worth
                )
            );

        })
    })

}