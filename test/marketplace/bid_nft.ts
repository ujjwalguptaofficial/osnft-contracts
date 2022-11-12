import { expect } from "chai";
import { ethers } from "hardhat";
import { IDeployedPayload } from "../interfaces";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";

export function testBidNFTAuction(payload: IDeployedPayload) {
    it('require valid auction id', async () => {
        const marketplace = payload.marketplace;
        const tx = marketplace.placeBid(
            payload.getSellId(
                payload.getProjectId(payload.projects["mahal"]),
                payload.signer3.address
            ),
            1000000
        );
        await expect(tx).revertedWith('No auction found');
    })

    it('bid amount less than current bid', async () => {
        const marketplace = payload.marketplace;
        const auctionId = payload.getSellId(
            payload.getProjectId(payload.projects["jsstore-example"]),
            payload.signer4.address
        );
        const bidPrice = await marketplace.getBidPrice(auctionId);
        const tx = marketplace.placeBid(
            payload.getSellId(
                payload.getProjectId(payload.projects["jsstore-example"]),
                payload.signer4.address
            ),
            bidPrice.sub(1)
        );
        await expect(tx).revertedWith('New bid price must be higher than current bid');
    })

    it('bid amount equal to current bid', async () => {
        const marketplace = payload.marketplace;
        const auctionId = payload.getSellId(
            payload.getProjectId(payload.projects["jsstore-example"]),
            payload.signer4.address
        );
        const bidPrice = await marketplace.getBidPrice(auctionId);
        const tx = marketplace.placeBid(
            auctionId,
            bidPrice
        );
        await expect(tx).revertedWith('New bid price must be higher than current bid');
    })

    it('bider should not be creator', async () => {
        const marketplace = payload.marketplace;
        const tx = marketplace.connect(payload.signer4).placeBid(
            payload.getSellId(
                payload.getProjectId(payload.projects["jsstore-example"]),
                payload.signer4.address
            ),
            1001
        );
        await expect(tx).revertedWith('Creator of auction cannot place new bid');
    })

    describe('successful bid', async () => {

        it('bid1', async () => {

            const marketplace = payload.marketplace;
            const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
            const seller = payload.signer4.address;
            const auctionId = payload.getSellId(
                nftId,
                seller
            );
            const bidAmount = 1001;
            const buyer = await payload.deployer.address;
            const balanceOfBuyerBeforeSale = await payload.erc20Token1.balanceOf(
                buyer
            );
            const tx = marketplace.placeBid(
                auctionId,
                bidAmount
            );
            await expect(tx).emit(marketplace, 'NewBidOnAuction').withArgs(
                auctionId,
                bidAmount
            );

            // balance of buyer should be deducted
            const balanceOfBuyerAfterSale = await payload.erc20Token1.balanceOf(
                buyer
            );
            expect(balanceOfBuyerAfterSale).equal(
                balanceOfBuyerBeforeSale.sub(bidAmount)
            );

            const bidOwner = await marketplace.getBidOwner(auctionId);
            expect(bidOwner).equal(buyer);

            const bidPrice = await marketplace.getBidPrice(auctionId);
            expect(bidPrice).equal(bidAmount);
        })

        it('bid with same price', async () => {
            const marketplace = payload.marketplace;
            const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
            const seller = payload.signer4.address;
            const auctionId = payload.getSellId(
                nftId,
                seller
            );
            const bidAmount = 1001;
            const tx = marketplace.placeBid(
                auctionId,
                bidAmount
            );
            await expect(tx).to.revertedWith('New bid price must be higher than current bid');
        })

        it('bid 2', async () => {
            const marketplace = payload.marketplace;
            const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
            const seller = payload.signer4.address;
            const auctionId = payload.getSellId(
                nftId,
                seller
            );
            const bidAmount = 1002;
            const buyer = await payload.signer2.address;
            const balanceOfBuyerBeforeSale = await payload.erc20Token1.balanceOf(
                buyer
            );

            await payload.erc20Token1.connect(payload.signer2).approve(payload.marketplace.address, ethers.constants.MaxUint256)

            const previousBidOwner = await marketplace.getBidOwner(auctionId);
            const previousBidAmount = await marketplace.getBidPrice(auctionId);
            const previousBidOwnerBalance = await payload.erc20Token1.balanceOf(previousBidOwner);

            const tx = marketplace.connect(payload.signer2).placeBid(
                auctionId,
                bidAmount
            );
            await expect(tx).emit(marketplace, 'NewBidOnAuction').withArgs(
                auctionId,
                bidAmount
            );

            // balance of buyer should be deducted
            const balanceOfBuyerAfterSale = await payload.erc20Token1.balanceOf(
                buyer
            );
            expect(balanceOfBuyerAfterSale).equal(
                balanceOfBuyerBeforeSale.sub(bidAmount)
            );

            const bidOwner = await marketplace.getBidOwner(auctionId);
            expect(bidOwner).equal(buyer);

            const bidPrice = await marketplace.getBidPrice(auctionId);
            expect(bidPrice).equal(bidAmount);

            // check for refund of previousBidOwner

            const previousBidOwnerBalanceAfterSale = await payload.erc20Token1.balanceOf(previousBidOwner);
            expect(previousBidOwnerBalanceAfterSale).equal(
                previousBidOwnerBalance.add(previousBidAmount)
            );
        })

        describe('claim nft', async () => {
            it('when auction is still open', async () => {
                const marketplace = payload.marketplace;
                const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
                const seller = payload.signer4.address;
                const auctionId = payload.getSellId(
                    nftId,
                    seller
                );

                const tx = marketplace.claimNFT(auctionId);
                await expect(tx).to.revertedWith('Auction is still open');
            });

            it('when auction end', async () => {

                console.log("timestamp of latest block", await time.latest());
                await mine(100);
                console.log("timestamp of latest block", await time.latest());

                const marketplace = payload.marketplace;
                const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
                const seller = payload.signer4.address;
                const auctionId = payload.getSellId(
                    nftId,
                    seller
                );

                const tx = marketplace.claimNFT(auctionId);
                await expect(tx).emit(marketplace, 'NFTClaimed').withArgs(
                    auctionId, nftId,
                    0,
                    1002,
                    payload.erc20Token1.address
                )
            });

            it('when auction no exist', async () => {
                const marketplace = payload.marketplace;
                const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
                const seller = payload.signer4.address;
                const auctionId = payload.getSellId(
                    nftId,
                    seller
                );

                const tx = marketplace.claimNFT(auctionId);
                await expect(tx).to.revertedWith('No auction found');
            });
        })
    });
}