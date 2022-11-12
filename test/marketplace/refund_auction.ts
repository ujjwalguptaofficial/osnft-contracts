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

        await expect(tx).to.revertedWith('No auction found');

    })

    it('successful auction for jsstore example', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const seller = payload.signer2.address;
        const endAuction = (await time.latest()) + 10; // Math.floor(Date.now() / 1000) + 10000;

        const tx = marketplace.connect(payload.signer2).createAuction(
            projectId,
            0,
            1000,
            endAuction,
            payload.erc20Token1.address
        );
        const auctionId = payload.getSellId(projectId, seller);
        await expect(tx).emit(marketplace, 'NewAuction').withArgs(
            projectId,
            seller,
            auctionId,
            0,
            1000,
            endAuction,
            payload.erc20Token1.address
        )

        const newOwner = await payload.nft.ownerOf(projectId);
        expect(newOwner).equal(marketplace.address);

        const bidOwner = await marketplace.getBidOwner(auctionId);
        expect(bidOwner).equal(ethers.constants.AddressZero);


        const bidPrice = await marketplace.getBidPrice(auctionId);
        expect(bidPrice).equal(1000);
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
        await expect(tx).to.revertedWith('Auction is still open');
    })

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

    it('successful refund', async () => {
        const marketplace = payload.marketplace;
        const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
        const seller = payload.signer2.address;
        const auctionId = payload.getSellId(
            nftId,
            seller
        );

        const oldOwner = await payload.nft.ownerOf(nftId);
        expect(oldOwner).equal(marketplace.address);

        const tx = marketplace.refundAuction(auctionId);
        await expect(tx).emit(marketplace, 'NFTRefunded').withArgs(
            auctionId, nftId, 0
        )

        const newOwner = await payload.nft.ownerOf(nftId);
        expect(newOwner).equal(seller);


    })
}