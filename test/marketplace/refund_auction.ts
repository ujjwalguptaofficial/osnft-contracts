import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { IDeployedPayload } from "../interfaces";

function addHours(date: Date, h: number) {
    date.setTime(date.getTime() + (h * 60 * 60 * 1000));
    return date;
}

export function testRefundAuction(payload: IDeployedPayload) {

    it('refund for not existing auction', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const seller = payload.signer4.address;
        const endAuction = (await time.latest()) + 100; // Math.floor(Date.now() / 1000) + 10000;
        const auctionId = payload.getSellId(projectId, seller);

        const tx = marketplace.connect(payload.signer4).refundAuction(
            auctionId
        );

        await expect(tx).to.revertedWith('no_auction_found');

    })

    it('successful auction for jsstore example', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const seller = payload.signer2.address;
        const endAuction = (await time.latest()) + 10; // Math.floor(Date.now() / 1000) + 10000;

        const tx = marketplace.connect(payload.signer2).createAuction({
            tokenId: projectId,
            share: 0,
            initialBid: 1000,
            endAuction,
            paymentToken: payload.erc20Token1.address,
            sellPriority: 0
        });
        const auctionId = payload.getSellId(projectId, seller);
        await expect(tx).emit(marketplace, 'Auction').withArgs(
            auctionId,
            1000,
            endAuction,
            payload.erc20Token1.address,
            0
        )
        await expect(tx).emit(payload.nft, 'Transfer').withArgs(
            seller,
            marketplace.address,
            projectId
        )

        const newOwner = await payload.nft.ownerOf(projectId);
        expect(newOwner).equal(marketplace.address);

        const bidOwner = await marketplace.getBidOwner(auctionId);
        expect(bidOwner).equal(ethers.constants.AddressZero);


        const bidPrice = await marketplace.getBidPrice(auctionId);
        expect(bidPrice).equal(1000);

        payload.transactions.sellJsStoreExamples.push(
            {
                txHash: (await tx).hash,
                expires: endAuction
            }
        )
    });

    it('refund when auction is open', async () => {
        const marketplace = payload.marketplace;
        const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
        const seller = payload.signer2.address;
        const auctionId = payload.getSellId(
            nftId,
            seller
        );

        const tx = marketplace.refundAuction(auctionId);
        await expect(tx).to.revertedWith('require_auction_close');
    })

    it('successful share auction for jsstore', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore"]
        );
        const seller = payload.deployer.address;
        // const endAuction = addHours(new Date(), 24).getTime();
        const endAuction = (await time.latest()) + 10;
        const shareToAuction = 100;
        const tx = marketplace.createAuction({
            tokenId: projectId,
            share: shareToAuction,
            initialBid: 10000,
            endAuction,
            paymentToken: payload.erc20Token1.address,
            sellPriority: 0
        });
        const auctionId = payload.getSellId(projectId, seller);
        await expect(tx).emit(marketplace, 'Auction').withArgs(
            auctionId,
            10000,
            endAuction,
            payload.erc20Token1.address,
            0
        )

        await expect(tx).emit(payload.nft, 'Transfer').withArgs(
            seller,
            marketplace.address,
            projectId
        )

        await expect(tx).emit(payload.nft, 'TransferShare').withArgs(
            shareToAuction
        )

        const shareOfMarketPlace = await payload.nft.shareOf(projectId, marketplace.address);
        expect(shareOfMarketPlace).equal(100);

        const bidOwner = await marketplace.getBidOwner(auctionId);
        expect(bidOwner).equal(ethers.constants.AddressZero);


        const bidPrice = await marketplace.getBidPrice(auctionId);
        expect(bidPrice).equal(10000 * shareToAuction);

        payload.transactions.sellJsStore.push(
            {
                txHash: (await tx).hash,
                expires: endAuction
            }
        )
    });

    it('expire auction', async () => {
        const marketplace = payload.marketplace;
        const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
        const seller = payload.signer2.address;
        const auctionId = payload.getSellId(
            nftId,
            seller
        );
        const isAuctionOpen = await marketplace.isAuctionOpen(auctionId);
        expect(isAuctionOpen).equal(true);
        console.log("timestamp of latest block", await time.latest());
        await mine(100);
        console.log("timestamp of latest block", await time.latest());

        const isAuctionOpenAfter = await marketplace.isAuctionOpen(auctionId);
        expect(isAuctionOpenAfter).equal(false);
    });

    it('expect isSellActive true after auction is closed', async () => {
        const tokenId = payload.getProjectId(payload.projects["jsstore-example"]);
        const from = payload.signer2.address;
        const marketplace = payload.marketplace;
        const sellId = payload.getSellId(tokenId, from);
        const isSellActive = await marketplace.isSellActive(sellId);

        expect(isSellActive).equal(true);
    })

    it('successful refund for jsstore example', async () => {
        const marketplace = payload.marketplace;
        const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
        const seller = payload.signer2.address;
        const auctionId = payload.getSellId(
            nftId,
            seller
        );

        const auctionInfo = await marketplace.getAuction(auctionId);

        const oldOwner = await payload.nft.ownerOf(nftId);
        expect(oldOwner).equal(marketplace.address);

        const tx = marketplace.refundAuction(auctionId);
        await expect(tx).emit(marketplace, 'Refund').withArgs(
            auctionId, auctionInfo.sellTimestamp
        )

        await expect(tx).emit(payload.nft, 'Transfer').withArgs(
            marketplace.address, seller, nftId
        )

        const newOwner = await payload.nft.ownerOf(nftId);
        expect(newOwner).equal(seller);

        payload.transactions.refundAuctionJsStoreExamples.push(
            (await tx).hash
        );
    })

    it('expect isSellActive false', async () => {
        const tokenId = payload.getProjectId(payload.projects["jsstore-example"]);
        const from = payload.signer2.address;
        const marketplace = payload.marketplace;
        const sellId = payload.getSellId(tokenId, from);
        const isSellActive = await marketplace.isSellActive(sellId);

        expect(isSellActive).equal(false);


    })

    it('expect isSellActive true after auction is closed', async () => {
        const tokenId = payload.getProjectId(payload.projects["jsstore"]);
        const from = payload.deployer.address;
        const marketplace = payload.marketplace;
        const sellId = payload.getSellId(tokenId, from);
        const isSellActive = await marketplace.isSellActive(sellId);

        expect(isSellActive).equal(true);

    })

    it('successful refund for jsstore ', async () => {
        const marketplace = payload.marketplace;
        const nftId = payload.getProjectId(payload.projects["jsstore"]);
        const seller = payload.deployer.address;
        const auctionId = payload.getSellId(
            nftId,
            seller
        );
        const sellInfo = await marketplace.getAuction(auctionId);

        const oldShare = await payload.nft.shareOf(nftId, seller);

        const tx = marketplace.refundAuction(auctionId);
        await expect(tx).emit(marketplace, 'Refund').withArgs(
            auctionId, sellInfo.sellTimestamp
        )
        await expect(tx).emit(payload.nft, 'Transfer').withArgs(
            marketplace.address, seller, nftId
        )
        await expect(tx).emit(payload.nft, 'TransferShare').withArgs(
            100
        )

        const newShare = await payload.nft.shareOf(nftId, seller);
        expect(newShare).equal(oldShare + 100);

        payload.transactions.refundAuctionJsStore = (await tx).hash;
    })

    it('expect isSellActive false', async () => {
        const tokenId = payload.getProjectId(payload.projects["jsstore"]);
        const from = payload.deployer.address;
        const marketplace = payload.marketplace;
        const sellId = payload.getSellId(tokenId, from);
        const isSellActive = await marketplace.isSellActive(sellId);

        expect(isSellActive).equal(false);
    })


}