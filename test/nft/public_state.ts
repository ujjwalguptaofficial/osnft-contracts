import { expect } from "chai";
import { IDeployedPayload } from "../interfaces";

export function runPublicState(payload: IDeployedPayload) {
    it('name', async () => {
        const value = await payload.nft.name();
        expect(value).equal('OpenSourceNFT');
    })

    it('symbol', async () => {
        const value = await payload.nft.symbol();
        expect(value).equal('OSNFT');
    })

    it('baseTokenURI', async () => {
        const value = await payload.nft.baseTokenURI();
        expect(value).equal('https://ujjwalnft.com/metadata/');
    })

    it('owner address', async () => {
        const ownerAddress = await payload.nft.owner();
        expect(ownerAddress).equal(payload.deployer.address);
    })
}