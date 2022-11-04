import { expect } from "chai";
import { IDeployedPayload } from "./interfaces";

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
            expect(value).equal(72986);
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
        });

        it('transfer from incorrect operator', async () => {
            const value = payload.nft.estimateGas["transferFrom(address,address,bytes32,uint32)"](
                payload.deployer.address,
                payload.signer3.address,
                projectId,
                1
            );
            await expect(value).to.revertedWith('ERC721: caller is not token owner nor approved');
        });

        it('estimate gas', async () => {

            const value = await payload.nft.connect(payload.signer2).estimateGas["transferFrom(address,address,bytes32,uint32)"](
                payload.signer2.address,
                payload.signer3.address,
                projectId,
                1
            );
            expect(value).equal(99977);
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

            await expect(value).to.revertedWith('ERC721: owner share is less than requested');
        });

        it('transferring zero share', async () => {

            const value = payload.nft.connect(payload.signer2)["transferFrom(address,address,bytes32,uint32)"](
                payload.signer2.address,
                payload.signer3.address,
                projectId,
                0
            );

            await expect(value).to.revertedWith('share should be greater than zero');
        });

    })
}