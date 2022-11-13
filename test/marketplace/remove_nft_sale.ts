import { expect } from "chai";
import { IDeployedPayload } from "../interfaces";

export function testRemoveSale(payload: IDeployedPayload) {

    it('remove for not existing auction', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const seller = payload.signer4.address;

        const sellId = payload.getSellId(projectId, seller);

        const tx = marketplace.connect(payload.signer4).removeNFTSale(
            sellId
        );

        await expect(tx).to.revertedWith('Require NFT listed');
    })

    it('successful sale for jsstore example', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const seller = payload.signer2.address;

        const tx = await marketplace.connect(payload.signer2).listNFTOnSale(
            projectId,
            0,
            1000,
            payload.erc20Token1.address
        );
        const auctionId = payload.getSellId(projectId, seller);
    });

    it('remove by non owner', async () => {
        const marketplace = payload.marketplace;
        const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
        const seller = payload.signer2.address;
        const auctionId = payload.getSellId(
            nftId,
            seller
        );

        const tx = marketplace.connect(payload.signer4).removeNFTSale(auctionId);
        await expect(tx).to.revertedWith('Require NFT ownership');
    })

    it('update nft sale', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const seller = payload.signer2.address;
        const sellId = payload.getSellId(projectId, seller);
        const tx = marketplace.connect(payload.signer2).updateNFTOnSale(
            sellId,
            0,
            10000,
            payload.erc20Token2.address
        );

        await expect(tx).to.emit(marketplace, 'NFTSaleUpdated').withArgs(
            sellId, 0, 10000,
            payload.erc20Token2.address
        );

        const nftSaleInfo = await marketplace.getNFTFromSale(sellId);

        expect(nftSaleInfo.price).equal(10000);
        expect(nftSaleInfo.paymentTokenAddress).equal(payload.erc20Token2.address);
    })

    it('successful remove', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const seller = payload.signer2.address;
        const sellId = payload.getSellId(projectId, seller);

        const tx = marketplace.connect(payload.signer2).removeNFTSale(
            sellId
        );

        await expect(tx).emit(marketplace, 'NftSaleCanceled').withArgs(
            sellId, projectId, seller
        );
    });
}