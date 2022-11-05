import { expect } from "chai";
import { constants } from "ethers";
import { IDeployedPayload } from "./interfaces";

export function testSetMarketPlace(payload: IDeployedPayload) {

    it('set by not owner', async () => {
        let tx = payload.nft.connect(payload.signer3).setDefaultMarketPlace(
            payload.defaultMarketPlace.address
        )

        await expect(tx).to.revertedWith('Ownable: caller is not the owner');
    })

    it('set marketplace', async () => {
        let isApprovedForAll = await payload.nft.isApprovedForAll(
            payload.deployer.address, payload.defaultMarketPlace.address
        );
        expect(isApprovedForAll).equal(false);

        const tx = await payload.nft.setDefaultMarketPlace(payload.defaultMarketPlace.address);

        const defaultMarketPlaceValue = await payload.nft.defaultMarketPlace();

        expect(defaultMarketPlaceValue).equal(payload.defaultMarketPlace.address);

        isApprovedForAll = await payload.nft.isApprovedForAll(payload.deployer.address, payload.defaultMarketPlace.address);
        expect(isApprovedForAll).equal(true);

        isApprovedForAll = await payload.nft.isApprovedForAll(payload.signer2.address, payload.defaultMarketPlace.address);
        expect(isApprovedForAll).equal(true);

        isApprovedForAll = await payload.nft.isApprovedForAll(payload.signer3.address, payload.defaultMarketPlace.address);
        expect(isApprovedForAll).equal(true);

        isApprovedForAll = await payload.nft.isApprovedForAll(payload.operator.address, payload.defaultMarketPlace.address);
        expect(isApprovedForAll).equal(true);
    })
}