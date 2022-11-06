import { expect } from "chai";
import { IDeployedPayload } from "../interfaces";

export function setBaseTokenURI(payload: IDeployedPayload) {
    it('estimate gas', async () => {
        const value = await payload.nft.estimateGas.setBaseTokenURI('https://ujjwalnft.com/metadata/')
        expect(value).equal(37304);
    })

    it('transaction', async () => {
        await payload.nft.setBaseTokenURI('https://ujjwalnft.com/')

        let value = await payload.nft.baseTokenURI();
        expect(value).equal('https://ujjwalnft.com/');

        await payload.nft.setBaseTokenURI('https://ujjwalnft.com/metadata/')

        value = await payload.nft.baseTokenURI();
        expect(value).equal('https://ujjwalnft.com/metadata/');

    })

    it('setting other than owner', async () => {
        const tx = payload.nft.connect(payload.signer2).setBaseTokenURI('https://ujjwalnft.com/');
        await expect(tx).to.be.revertedWith('Ownable: caller is not the owner');
    })
}