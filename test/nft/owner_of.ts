import { expect } from "chai";
import { IDeployedPayload } from "../interfaces";

export function testOwnerOf(payload: IDeployedPayload) {
    it('owner of invalid project', async () => {
        const projectUrl = 'github.com/ujjwalguptaofficial/abc'
        const expectedTokenId = payload.getProjectId(projectUrl);
        const value = payload.nft.ownerOf(expectedTokenId);
        await expect(value).to.revertedWith('ERC721: invalid token ID');
    })

    it('owner of mahal', async () => {
        const projectUrl = 'github.com/ujjwalguptaofficial/mahal'
        const expectedTokenId = payload.getProjectId(projectUrl);
        const value = await payload.nft.ownerOf(expectedTokenId);
        expect(value).to.equal(payload.signer2.address);
    })

    it('owner of jsstore examples', async () => {
        const projectUrl = payload.projects["jsstore-example"];
        const expectedTokenId = payload.getProjectId(projectUrl);
        const value = await payload.nft.ownerOf(expectedTokenId);
        expect(value).to.equal(payload.deployer.address);
    })

    it('owner of mahal examples', async () => {
        const projectUrl = 'github.com/ujjwalguptaofficial/mahal-examples';
        const expectedTokenId = payload.getProjectId(projectUrl);
        const value = await payload.nft.ownerOf(expectedTokenId);
        expect(value).to.equal(payload.signer2.address);
    });
}