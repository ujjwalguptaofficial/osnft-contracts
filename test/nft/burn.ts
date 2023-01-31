import { expect } from "chai";
import { constants } from "ethers";
import { ethers } from "hardhat";
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


    describe("burn when nft is not approved", () => {
        it('Only approver allowed', async () => {
            const nft = payload.nft.connect(payload.signer4);
            const projectId = payload.getProjectId(payload.projects["godam-vue"]);
            const tx = nft.burn(projectId);

            await expect(tx).to.revertedWith(`only_approver_allowed`);
        })

        it('add approver', async () => {
            const tx = payload.approver.addApprover(payload.nft.address);
            await expect(tx).emit(payload.approver, 'ApproverAdded').withArgs(
                payload.nft.address
            );
        });
    })

    describe('burn success', () => {

        it('approve to signer4', async () => {
            const projectUrl = payload.projects["solidity-learning"];
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

        it('share tokens', async () => {
            const nft = payload.nft;


            const projectId = payload.getProjectId(payload.projects["solidity-learning"]);
            const from = payload.deployer.address;

            const approvedProjectBefore = await payload.approver.getApprovedProject(projectId);

            const balanceofFrom = await nft.balanceOf(from);
            const shareOf = await nft.shareOf(
                projectId, from
            )

            expect(shareOf).equal(100);
            const nativeToken = payload.nativeToken;
            const balanceOfOSD = await nativeToken.balanceOf(from);

            const owner = await nft.ownerOf(projectId);

            expect(owner).equal(from);

            const tx = nft.burn(projectId);

            await expect(tx).to.emit(nft, 'Transfer').withArgs(
                from,
                constants.AddressZero,
                projectId
            )

            const ownerAfterBurn = nft.ownerOf(projectId);

            await expect(ownerAfterBurn).to.revertedWith(`ERC721: invalid token ID`);

            const balanceofFromAfter = await nft.balanceOf(from);

            expect(balanceofFromAfter).equal(
                balanceofFrom.sub(1)
            )

            const shareOfAfter = nft.shareOf(
                projectId, from
            )

            await expect(shareOfAfter).to.revertedWith(`ERC721: invalid token ID`);

            const balanceOfOSDAfter = await nativeToken.balanceOf(from);
            expect(balanceOfOSDAfter).equal(
                balanceOfOSD.sub(
                    approvedProjectBefore.worth
                )
            );

            // check burn at approver

            const approvedProject = await payload.approver.getApprovedProject(projectId);

            expect(approvedProject.worth).equal(0);
            expect(approvedProject.mintTo).equal(constants.AddressZero);

            expect(tx).to.emit(payload.approver, "ProjectBurned").withArgs(
                projectId
            );

            payload.transactions['burnSolidityLearning'] = (await tx).hash;

        })

        it('check approval after burn', async () => {
            const projectUrl = payload.projects["solidity-learning"];
            const expectedTokenId = payload.getProjectId(projectUrl);
            const owner = payload.deployer.address;

            let approvedAddress = payload.nft["getApproved(bytes32,address)"](expectedTokenId, owner);
            await expect(approvedAddress).revertedWith(`ERC721: invalid token ID`);

            const approvedValueWithoutShare = payload.nft["getApproved(bytes32)"](expectedTokenId);
            await expect(approvedValueWithoutShare).revertedWith(`ERC721: invalid token ID`);

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

            const approvedProject = await payload.approver.getApprovedProject(projectId);

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
            const approvedProjectAfter = await payload.approver.getApprovedProject(projectId);
            expect(balanceOfOSDAfter).equal(
                balanceOfOSD.sub(
                    approvedProject.worth
                )
            );

            expect(approvedProjectAfter.worth).equal(0);
            expect(approvedProjectAfter.mintTo).equal(constants.AddressZero);

            payload.transactions['burnGodamVue'] = (await tx).hash;

        })
    })

}