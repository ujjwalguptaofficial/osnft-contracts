import { expect } from "chai";
import { ethers } from "hardhat";
import { IDeployedPayload } from "../interfaces";

export function testTransferFrom(payload: IDeployedPayload) {


    describe('percentage cut', () => {
        const projectUrl = payload.projects["mahal-example"];
        const projectId = payload.getProjectId(projectUrl);

        it('transfer from incorrect owner as from value', async () => {
            const value = payload.nft.connect(payload.signer2).estimateGas["transferFrom(address,address,bytes32)"](
                payload.deployer.address,
                payload.signer3.address,
                projectId,
            );
            await expect(value).to.revertedWith('ERC721: transfer from incorrect owner');
        });

        it('transfer from incorrect operator', async () => {
            const value = payload.nft.estimateGas["transferFrom(address,address,bytes32)"](
                payload.deployer.address,
                payload.signer3.address,
                projectId,
            );
            await expect(value).to.revertedWith('ERC721: caller is not token owner nor approved');
        });

        it('estimate gas', async () => {
            const value = await payload.nft.connect(payload.signer2).estimateGas["transferFrom(address,address,bytes32)"](
                payload.signer2.address,
                payload.signer3.address,
                projectId,
            );
            expect(value).equal(55471);
        });

        it('invalid project', async () => {
            const projectUrl = 'github.com/ujjwalguptaofficial/abc'
            const expectedTokenId = payload.getProjectId(projectUrl);
            const value = payload.nft["transferFrom(address,address,bytes32)"](
                payload.signer2.address,
                payload.signer3.address,
                expectedTokenId
            );
            await expect(value).to.revertedWith('ERC721: invalid token ID');
        })

        it('transferring share project using percentage cut', async () => {
            const projectUrl = payload.projects["mahal"];
            const projectId = payload.getProjectId(projectUrl);

            const value = payload.nft.connect(payload.signer2)["transferFrom(address,address,bytes32)"](
                payload.signer2.address,
                payload.signer3.address,
                projectId,
            );

            await expect(value).to.revertedWith('Input share should be above zero');
        });

        it('transfer to signer3 from deployer as owner', async () => {
            const projectUrl = payload.projects["jsstore-example"];
            const expectedTokenId = payload.getProjectId(projectUrl);
            const from = payload.deployer.address;
            const to = payload.signer3.address;

            const balanceOfFrom = await payload.nft.balanceOf(from);
            expect(balanceOfFrom).equal(2);

            const balanceOfTo = await payload.nft.balanceOf(to);
            expect(balanceOfTo).equal(1);

            let owner = await payload.nft.ownerOf(expectedTokenId);
            expect(owner).equal(from);

            const value = payload.nft["transferFrom(address,address,bytes32)"](
                from,
                to,
                expectedTokenId
            );
            await expect(value).to.emit(payload.nft, 'Transfer').withArgs(
                from,
                to,
                expectedTokenId
            )

            const balanceOfFromAfterTransfer = await payload.nft.balanceOf(from);
            expect(balanceOfFromAfterTransfer).equal(balanceOfFrom.sub(1));

            const balanceOfToAfterTransfer = await payload.nft.balanceOf(to);
            expect(balanceOfToAfterTransfer).equal(balanceOfTo.add(1));

            owner = await payload.nft.ownerOf(expectedTokenId);
            expect(owner).equal(to);
        })
    })

    describe('shares', () => {

        const projectUrl = payload.projects["mahal"];
        const projectId = payload.getProjectId(projectUrl);

        it('transfer from incorrect owner as from value', async () => {
            const value = payload.nft.connect(payload.signer2).estimateGas["transferFrom(address,address,bytes32,uint32)"](
                payload.deployer.address,
                payload.signer3.address,
                projectId,
                1
            );
            await expect(value).to.revertedWith('ERC721: owner share is less than requested');
            // await expect(value).to.revertedWith('ERC721: owner share is less than requested');
        });

        it('transfer from incorrect operator', async () => {
            const value = payload.nft.estimateGas["transferFrom(address,address,bytes32,uint32)"](
                payload.deployer.address,
                payload.signer3.address,
                projectId,
                1
            );
            await expect(value).to.revertedWith('ERC721: caller is not token share owner nor approved');
        });

        it('estimate gas', async () => {

            const value = await payload.nft.connect(payload.signer2).estimateGas["transferFrom(address,address,bytes32,uint32)"](
                payload.signer2.address,
                payload.signer3.address,
                projectId,
                1
            );
            expect(value).equal(94568);

        });

        it('invalid project', async () => {
            const projectUrl = 'github.com/ujjwalguptaofficial/abc'
            const expectedTokenId = payload.getProjectId(projectUrl);
            const value = payload.nft["transferFrom(address,address,bytes32,uint32)"](
                payload.signer2.address,
                payload.signer3.address,
                expectedTokenId,
                1
            );
            await expect(value).to.revertedWith('ERC721: invalid token ID');
        })

        it('transferring share more than available', async () => {

            const value = payload.nft.connect(payload.signer2)["transferFrom(address,address,bytes32,uint32)"](
                payload.signer2.address,
                payload.signer3.address,
                projectId,
                100001
            );

            await expect(value).to.revertedWith('ERC721: caller is not token share owner nor approved');
        });

        it('transferring zero share', async () => {

            const value = payload.nft.connect(payload.signer2)["transferFrom(address,address,bytes32,uint32)"](
                payload.signer2.address,
                payload.signer3.address,
                projectId,
                0
            );

            await expect(value).to.revertedWith('Input share should be above zero');
        });

        it('transfer to signer3 from signer2 as owner', async () => {
            const projectUrl = payload.projects["mahal"];
            const expectedTokenId = payload.getProjectId(projectUrl);
            const from = payload.signer2.address;
            const to = payload.signer3.address;

            const balanceOfFrom = await payload.nft.balanceOf(from);
            expect(balanceOfFrom).equal(2);

            const balanceOfTo = await payload.nft.balanceOf(to);
            // expect(balanceOfTo).equal(1);

            let owner = await payload.nft.ownerOf(expectedTokenId);
            expect(owner).equal(from);

            const shareOfFrom = await payload.nft.shareOf(expectedTokenId, from);

            const value = payload.nft.connect(payload.signer2)["transferFrom(address,address,bytes32,uint32)"](
                from,
                to,
                expectedTokenId,
                100
            );
            await expect(value).to.emit(payload.nft, 'Transfer').withArgs(
                from,
                to,
                expectedTokenId
            )
            await expect(value).to.emit(payload.nft, 'TransferShare').withArgs(
                100
            )

            const balanceOfFromAfterTransfer = await payload.nft.balanceOf(from);
            expect(balanceOfFromAfterTransfer).equal(balanceOfFrom);

            const balanceOfToAfterTransfer = await payload.nft.balanceOf(to);
            expect(balanceOfToAfterTransfer).equal(balanceOfTo.add(1));

            owner = await payload.nft.ownerOf(expectedTokenId);
            expect(owner).equal(payload.nft.address);

            const shareOfFromAfterTransfer = await payload.nft.shareOf(expectedTokenId, from);
            expect(shareOfFromAfterTransfer).equal(shareOfFrom - 100);

            const shareOfToAfterTransfer = await payload.nft.shareOf(expectedTokenId, to);
            expect(shareOfToAfterTransfer).equal(100);
        })

        it('transfer all share to signer3 from signer2 as owner', async () => {
            const projectUrl = payload.projects["mahal"];
            const expectedTokenId = payload.getProjectId(projectUrl);
            const from = payload.signer2.address;
            const to = payload.signer3.address;

            const balanceOfFrom = await payload.nft.balanceOf(from);
            expect(balanceOfFrom).equal(2);

            const balanceOfTo = await payload.nft.balanceOf(to);
            // expect(balanceOfTo).equal(2);

            const shareOfFrom = await payload.nft.shareOf(expectedTokenId, from);

            const value = payload.nft.connect(payload.signer2)["transferFrom(address,address,bytes32,uint32)"](
                from,
                to,
                expectedTokenId,
                shareOfFrom
            );
            await expect(value).to.emit(payload.nft, 'Transfer').withArgs(
                from,
                to,
                expectedTokenId
            )
            await expect(value).to.emit(payload.nft, 'TransferShare').withArgs(
                shareOfFrom
            )

            const balanceOfFromAfterTransfer = await payload.nft.balanceOf(from);
            expect(balanceOfFromAfterTransfer).equal(balanceOfFrom.sub(1));

            const balanceOfToAfterTransfer = await payload.nft.balanceOf(to);
            expect(balanceOfToAfterTransfer).equal(balanceOfTo);

            const owner = await payload.nft.ownerOf(expectedTokenId);
            expect(owner).equal(to);

            const shareOfFromAfterTransfer = await payload.nft.shareOf(expectedTokenId, from);
            expect(shareOfFromAfterTransfer).equal(0);

            const shareOfToAfterTransfer = await payload.nft.shareOf(expectedTokenId, to);
            expect(shareOfToAfterTransfer).equal(10000);
        })

        it('approve to operator and transfer all share to signer2 from signer3', async () => {
            const projectUrl = payload.projects["mahal"];
            const expectedTokenId = payload.getProjectId(projectUrl);
            const from = payload.signer3.address;
            const to = payload.signer2.address;

            const balanceOfFrom = await payload.nft.balanceOf(from);

            const balanceOfTo = await payload.nft.balanceOf(to);

            const shareOfFrom = await payload.nft.shareOf(expectedTokenId, from);

            // approve to operator

            await payload.nft.connect(payload.signer3)["approve(address,bytes32)"](payload.operator.address, expectedTokenId);

            const value = payload.nft.connect(payload.operator)["transferFrom(address,address,bytes32,uint32)"](
                from,
                to,
                expectedTokenId,
                shareOfFrom
            );
            await expect(value).to.emit(payload.nft, 'Transfer').withArgs(
                from,
                to,
                expectedTokenId
            )
            await expect(value).to.emit(payload.nft, 'TransferShare').withArgs(
                shareOfFrom
            )

            const balanceOfFromAfterTransfer = await payload.nft.balanceOf(from);
            expect(balanceOfFromAfterTransfer).equal(balanceOfFrom.sub(1));

            const balanceOfToAfterTransfer = await payload.nft.balanceOf(to);
            expect(balanceOfToAfterTransfer).equal(balanceOfTo.add(1));

            const owner = await payload.nft.ownerOf(expectedTokenId);
            expect(owner).equal(to);

            const shareOfFromAfterTransfer = await payload.nft.shareOf(expectedTokenId, from);
            expect(shareOfFromAfterTransfer).equal(0);

            const shareOfToAfterTransfer = await payload.nft.shareOf(expectedTokenId, to);
            expect(shareOfToAfterTransfer).equal(10000);
        })

        it('transfer jsstore to signer3', async () => {
            const projectUrl = payload.projects["jsstore"];
            const expectedTokenId = payload.getProjectId(projectUrl);
            const from = payload.deployer.address;
            const to = payload.signer3.address;

            const balanceOfFrom = await payload.nft.balanceOf(from);

            const balanceOfTo = await payload.nft.balanceOf(to);

            const shareToTransfer = 100;

            const value = payload.nft["transferFrom(address,address,bytes32,uint32)"](
                from,
                to,
                expectedTokenId,
                shareToTransfer
            );
            await expect(value).to.emit(payload.nft, 'Transfer').withArgs(
                from,
                to,
                expectedTokenId
            )
            await expect(value).to.emit(payload.nft, 'TransferShare').withArgs(
                shareToTransfer
            )

            const balanceOfFromAfterTransfer = await payload.nft.balanceOf(from);
            expect(balanceOfFromAfterTransfer).equal(balanceOfFrom);

            const balanceOfToAfterTransfer = await payload.nft.balanceOf(to);
            expect(balanceOfToAfterTransfer).equal(balanceOfTo.add(1));

            const owner = await payload.nft.ownerOf(expectedTokenId);
            expect(owner).equal(payload.nft.address);

            const shareOfFromAfterTransfer = await payload.nft.shareOf(expectedTokenId, from);
            expect(shareOfFromAfterTransfer).equal(9900);

            const shareOfToAfterTransfer = await payload.nft.shareOf(expectedTokenId, to);
            expect(shareOfToAfterTransfer).equal(100);
        })

        it('to signer2 from deployer using approveedAll operator', async () => {
            const projectUrl = payload.projects["jsstore"];
            const expectedTokenId = payload.getProjectId(projectUrl);
            const from = payload.deployer.address;
            const to = payload.signer2.address;

            const balanceOfFrom = await payload.nft.balanceOf(from);

            const balanceOfTo = await payload.nft.balanceOf(to);

            const shareToTransfer = 1000;
            const isApprovedForAll = await payload.nft.isApprovedForAll(
                from,
                payload.operator.address
            );

            expect(isApprovedForAll).equal(true);

            // for this test - its important that owner is nft
            const ownerValue = await payload.nft.ownerOf(expectedTokenId);
            expect(ownerValue).equal(payload.nft.address);

            const value = payload.nft.connect(payload.operator)["transferFrom(address,address,bytes32,uint32)"](
                from,
                to,
                expectedTokenId,
                shareToTransfer
            );
            await expect(value).to.emit(payload.nft, 'Transfer').withArgs(
                from,
                to,
                expectedTokenId
            )
            await expect(value).to.emit(payload.nft, 'TransferShare').withArgs(
                shareToTransfer
            )

            const balanceOfFromAfterTransfer = await payload.nft.balanceOf(from);
            expect(balanceOfFromAfterTransfer).equal(balanceOfFrom);

            const balanceOfToAfterTransfer = await payload.nft.balanceOf(to);
            expect(balanceOfToAfterTransfer).equal(balanceOfTo.add(1));

            const owner = await payload.nft.ownerOf(expectedTokenId);
            expect(owner).equal(payload.nft.address);

            const shareOfFromAfterTransfer = await payload.nft.shareOf(expectedTokenId, from);
            expect(shareOfFromAfterTransfer).equal(8900);

            const shareOfToAfterTransfer = await payload.nft.shareOf(expectedTokenId, to);
            expect(shareOfToAfterTransfer).equal(shareToTransfer);
        })

        describe('transfer using approved user by signer4', async () => {

            it('transfer to signer3 from deployer', async () => {
                const projectUrl = payload.projects["jsstore"];
                const expectedTokenId = payload.getProjectId(projectUrl);
                const from = payload.deployer.address;
                const to = payload.signer3.address;

                const balanceOfFrom = await payload.nft.balanceOf(from);

                const balanceOfTo = await payload.nft.balanceOf(to);

                const shareOfTo = await payload.nft.shareOf(expectedTokenId, to);

                const shareToTransfer = 1000;

                // for this test - its important that owner is nft
                const ownerValue = await payload.nft.ownerOf(expectedTokenId);
                expect(ownerValue).equal(payload.nft.address);

                const value = payload.nft.connect(payload.signer4)["transferFrom(address,address,bytes32,uint32)"](
                    from,
                    to,
                    expectedTokenId,
                    shareToTransfer
                );
                await expect(value).to.emit(payload.nft, 'Transfer').withArgs(
                    from,
                    to,
                    expectedTokenId
                )
                await expect(value).to.emit(payload.nft, 'TransferShare').withArgs(
                    shareToTransfer
                )

                const balanceOfFromAfterTransfer = await payload.nft.balanceOf(from);
                expect(balanceOfFromAfterTransfer).equal(balanceOfFrom);

                const balanceOfToAfterTransfer = await payload.nft.balanceOf(to);
                expect(balanceOfToAfterTransfer).equal(balanceOfTo);

                const owner = await payload.nft.ownerOf(expectedTokenId);
                expect(owner).equal(payload.nft.address);

                const shareOfFromAfterTransfer = await payload.nft.shareOf(expectedTokenId, from);
                expect(shareOfFromAfterTransfer).equal(7900);

                const shareOfToAfterTransfer = await payload.nft.shareOf(expectedTokenId, to);
                expect(shareOfToAfterTransfer).equal(shareToTransfer + shareOfTo);
            })

            it('transfer to signer3 from signer2 - signer4 is not approved by signer2', async () => {
                const projectUrl = payload.projects["jsstore"];
                const expectedTokenId = payload.getProjectId(projectUrl);

                const from = payload.signer2.address;
                const to = payload.signer3.address;

                const shareOfFrom = await payload.nft.shareOf(expectedTokenId, from);

                expect(shareOfFrom).equal(1000);

                const shareToTransfer = 1000;



                // for this test - its important that owner is nft
                const ownerValue = await payload.nft.ownerOf(expectedTokenId);
                expect(ownerValue).equal(payload.nft.address);

                const nftWithSigner4 = payload.nft.connect(payload.signer4);

                const approvedValueWithoutShare = await nftWithSigner4["getApproved(bytes32)"](expectedTokenId);
                expect(approvedValueWithoutShare).equal(ethers.constants.AddressZero);

                const approvedValueWithShare = await nftWithSigner4["getApproved(bytes32,address)"](expectedTokenId,
                    from
                );
                expect(approvedValueWithShare).equal(ethers.constants.AddressZero);

                const isApprovedForAll = await nftWithSigner4.isApprovedForAll(
                    from,
                    payload.signer4.address
                );
                expect(isApprovedForAll).equal(false);


                const value = nftWithSigner4["transferFrom(address,address,bytes32,uint32)"](
                    from,
                    to,
                    expectedTokenId,
                    shareToTransfer
                );

                await expect(value).to.revertedWith('ERC721: caller is not token share owner nor approved')
            })
        })
    })
}