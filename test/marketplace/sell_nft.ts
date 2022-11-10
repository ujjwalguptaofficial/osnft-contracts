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

        expect(tx).equal(157542);
    });

    it("price zero", async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const price = 10000000000;
        const tx = marketplace.connect(payload.signer3).estimateGas.listNFTOnSale(
            tokenId,
            0,
            0,
            payload.erc20Token1.address
        );

        await expect(tx).revertedWith('Price must be above zero');
    });

    it("non payable token", async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const price = 10000000000;
        const tx = marketplace.connect(payload.signer3).estimateGas.listNFTOnSale(
            tokenId,
            0,
            price,
            payload.defaultMarketPlace.address
        );

        await expect(tx).revertedWith('Invalid payment token');
    });

    it("add jsstore-example (percentage cut) on sale", async () => {
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

        await expect(tx).revertedWith('Already on sale');
    });

    it('add share token on sale with zero share', async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["jsstore"]
        );
        const price = 10000000000;
        const tx = marketplace.connect(payload.signer4).listNFTOnSale(
            tokenId,
            0,
            price,
            payload.defaultMarketPlace.address
        );

        await expect(tx).revertedWith('Require input share to be above zero');
    });

    describe('add share token on sale with share more than have', async () => {

        it('owner have zero share', async () => {
            const marketplace = payload.marketplace;
            const tokenId = payload.getProjectId(
                payload.projects["jsstore"]
            );
            const price = 10000000000;
            const shareOf = await payload.nft.connect(payload.signer4).shareOf(tokenId, payload.signer4.address);
            expect(shareOf).equal(0);
            const tx = marketplace.connect(payload.signer4).listNFTOnSale(
                tokenId,
                shareOf + 1,
                price,
                payload.defaultMarketPlace.address
            );

            await expect(tx).revertedWith('Owns less share than input');
        })

        it('owner have share more than zero', async () => {
            const marketplace = payload.marketplace;
            const tokenId = payload.getProjectId(
                payload.projects["mahal"]
            );
            const price = 10000000000;
            const shareOf = await payload.nft.shareOf(tokenId, payload.signer2.address);
            expect(shareOf).greaterThan(0);

            const tx = marketplace.connect(payload.signer2).listNFTOnSale(
                tokenId,
                shareOf + 1,
                price,
                payload.defaultMarketPlace.address
            );

            await expect(tx).revertedWith('Owns less share than input');
        })

    });

    it('add share token on sale', async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["jsstore"]
        );
        const price = 10000000000;
        const shareToSell = 100;

        const shareOf = await payload.nft.connect(payload.signer3).shareOf(tokenId, payload.signer3.address);
        expect(shareOf).greaterThan(shareToSell);

        const tx = marketplace.connect(payload.signer3).listNFTOnSale(
            tokenId,
            shareToSell,
            price,
            payload.erc20Token1.address
        );
        const from = payload.signer3.address;
        const sellId = payload.getSellId(tokenId, from);
        await expect(tx).emit(marketplace, 'NFTSaleAdded').withArgs(
            tokenId,
            from,
            sellId,
            shareToSell,
            price,
            payload.erc20Token1.address
        );

        const nftData = await marketplace.getNFTFromSale(sellId);

        expect(nftData.seller).equal(from);
        expect(nftData.paymentTokenAddress).equal(payload.erc20Token1.address);
        expect(nftData.share).equal(shareToSell);
        expect(nftData.price).equal(price);
        expect(nftData.tokenId).equal(tokenId);

    });

    it('add share token again on sale', async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["jsstore"]
        );
        const price = 10000000000;
        const shareToSell = 100;

        const shareOf = await payload.nft.connect(payload.signer3).shareOf(tokenId, payload.signer3.address);
        expect(shareOf).greaterThan(shareToSell);

        const tx = marketplace.connect(payload.signer3).listNFTOnSale(
            tokenId,
            shareToSell,
            price,
            payload.erc20Token1.address
        );
        await expect(tx).revertedWith('Already on sale')

    });

    it("add mahal-example (percentage cut) on sale", async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["mahal-example"]
        );
        const price = 10000000005;
        const tx = marketplace.connect(payload.signer2).listNFTOnSale(
            tokenId,
            0,
            price,
            payload.erc20Token1.address
        );
        const from = payload.signer2.address;
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
}
