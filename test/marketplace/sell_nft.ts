import { expect } from "chai";
import { ethers } from "hardhat";
import { IDeployedPayload } from "../interfaces";

export function testNFTSale(payload: IDeployedPayload) {
    it("add nft on sale by non owner", async () => {
        const marketplace = payload.marketplace;
        const tx = marketplace.connect(payload.signer4).listNFTOnSale(
            payload.getProjectId(
                payload.projects["jsstore-example"]
            ),
            0,
            1000000,
            payload.erc20Token1.address
        );
        await expect(tx).revertedWith('Require NFT ownership');
    });

    it("not approved for marketplace", async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const tx = marketplace.connect(payload.signer3).listNFTOnSale(
            projectId,
            0,
            10000000000,
            payload.erc20Token1.address
        );
        const from = payload.signer2.address;
        await expect(tx).revertedWith('Require NFT ownership transfer approval');
    });

    it('change default marketplace', async () => {
        const defaultMarketPlace = payload.marketplace.address;
        const tx = await payload.nft.setDefaultMarketPlace(defaultMarketPlace);

        const defaultMarketPlaceValue = await payload.nft.defaultMarketPlace();

        expect(defaultMarketPlaceValue).equal(defaultMarketPlace);
    });

    it("estimate gas", async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const price = 10000000000;
        const tx = await marketplace.connect(payload.signer3).estimateGas.listNFTOnSale(
            tokenId,
            0,
            price,
            payload.erc20Token1.address
        );

        expect(tx).equal(165581);
    });

    it("add jsstore-example on sale", async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const price = 10000000000;
        const tx = marketplace.connect(payload.signer3).listNFTOnSale(
            tokenId,
            0,
            price,
            payload.erc20Token1.address
        );
        const from = payload.signer3.address;
        const sellId = payload.getSellId(tokenId, from);
        await expect(tx).emit(marketplace, 'NFTSaleAdded').withArgs(
            tokenId,
            from,
            sellId,
            0,
            price,
            payload.erc20Token1.address
        );

        const nftData = await marketplace.getNFTFromSale(sellId);

        expect(nftData.seller).equal(from);
        expect(nftData.paymentTokenAddress).equal(payload.erc20Token1.address);
        expect(nftData.share).equal(0);
        expect(nftData.price).equal(price);
        expect(nftData.tokenId).equal(tokenId);

    });


    it("add listed item on sale again", async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const price = 10000000000;
        const tx = marketplace.connect(payload.signer3).listNFTOnSale(
            tokenId,
            0,
            price,
            payload.erc20Token1.address
        );

        await expect(tx).revertedWith('');
    });


}
