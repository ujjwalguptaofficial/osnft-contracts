import { expect } from "chai";
import { IDeployedPayload } from "../interfaces";

export function testProjectMeta(payload: IDeployedPayload) {

    describe('creator cut', async () => {
        it('invalid project', async () => {
            const projectUrl = 'github.com/ujjwalguptaofficial/abc'
            const expectedTokenId = payload.getProjectId(projectUrl);
            const value = payload.nft.creatorCut(expectedTokenId);
            await expect(value).to.revertedWith('ERC721: invalid token ID');
        })

        it('jsstore example', async () => {
            const projectUrl = payload.projects["jsstore-example"];
            const expectedTokenId = payload.getProjectId(projectUrl);
            const value = await payload.nft.creatorCut(expectedTokenId);
            await expect(value).to.equal(30);
        })

        it('mahal example', async () => {
            const projectUrl = payload.projects["mahal-example"];
            const expectedTokenId = payload.getProjectId(projectUrl);
            const value = await payload.nft.creatorCut(expectedTokenId);
            await expect(value).to.equal(40);
        })
    })

    describe('creator of', async () => {
        it('invalid project', async () => {
            const projectUrl = 'github.com/ujjwalguptaofficial/abc'
            const expectedTokenId = payload.getProjectId(projectUrl);
            const value = payload.nft.creatorOf(expectedTokenId);
            await expect(value).to.revertedWith('ERC721: invalid token ID');
        })

        it('mahal example', async () => {
            const projectUrl = payload.projects["mahal-example"];
            const expectedTokenId = payload.getProjectId(projectUrl);
            const value = await payload.nft.creatorOf(expectedTokenId);
            await expect(value).to.equal(payload.signer2.address);
        })
    })

    describe('share of', async () => {
        it('invalid project', async () => {
            const projectUrl = 'github.com/ujjwalguptaofficial/abc'
            const expectedTokenId = payload.getProjectId(projectUrl);
            const value = payload.nft.shareOf(expectedTokenId, payload.deployer.address);
            await expect(value).to.revertedWith('ERC721: invalid token ID');
        })

        it('valid project with invalid owner', async () => {
            const projectUrl = 'github.com/ujjwalguptaofficial/mahal'
            const expectedTokenId = payload.getProjectId(projectUrl);
            const value = await payload.nft.shareOf(expectedTokenId, payload.signer3.address);
            await expect(value).to.equal(0);
        })

        it('valid project with minter', async () => {
            const projectUrl = 'github.com/ujjwalguptaofficial/mahal'
            const expectedTokenId = payload.getProjectId(projectUrl);
            const value = await payload.nft.shareOf(expectedTokenId, payload.signer2.address);
            const totalShare = await payload.nft.totalShareOf(expectedTokenId);
            expect(totalShare).equal(10000);
            await expect(value).to.equal(totalShare);
        })
    })

    it('tokenURI', async () => {
        const projectId = payload.getProjectId(payload.projects["jsstore-example"]);
        const value = await payload.nft.tokenURI(
            projectId
        );
        expect(value.toLowerCase()).equal('https://ujjwalnft.com/metadata/' + projectId.toString().toLowerCase());
    })
}