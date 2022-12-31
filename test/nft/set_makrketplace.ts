import { expect } from "chai";
import { constants } from "ethers";
import { IDeployedPayload } from "../interfaces";

export function testSetMarketPlace(payload: IDeployedPayload) {

    it('set by not owner', async () => {
        let tx = payload.nft.connect(payload.signer3)["defaultMarketPlace(address)"](
            payload.marketplace.address
        )

        await expect(tx).to.revertedWith('Ownable: caller is not the owner');
    })

    it('set marketplace', async () => {
        const marketplaceAddress = payload.marketplace.address;
        expect(marketplaceAddress).not.null;
        let isApprovedForAll = await payload.nft.isApprovedForAll(
            payload.deployer.address, marketplaceAddress
        );
        expect(isApprovedForAll).equal(false);

        const tx = await payload.nft["defaultMarketPlace(address)"](marketplaceAddress);

        const defaultMarketPlaceValue = await payload.nft["defaultMarketPlace()"]();

        expect(defaultMarketPlaceValue).equal(marketplaceAddress);

        isApprovedForAll = await payload.nft.isApprovedForAll(payload.deployer.address, marketplaceAddress);
        expect(isApprovedForAll).equal(true);

        isApprovedForAll = await payload.nft.isApprovedForAll(payload.signer2.address, marketplaceAddress);
        expect(isApprovedForAll).equal(true);

        isApprovedForAll = await payload.nft.isApprovedForAll(payload.signer3.address, marketplaceAddress);
        expect(isApprovedForAll).equal(true);

        isApprovedForAll = await payload.nft.isApprovedForAll(payload.operator.address, marketplaceAddress);
        expect(isApprovedForAll).equal(true);
    })
}