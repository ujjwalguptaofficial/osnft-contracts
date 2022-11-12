import { expect } from "chai";
import { ethers } from "hardhat";
import { IDeployedPayload } from "../interfaces";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber, BigNumberish } from "ethers";

const getPercentage = (value: BigNumber, percentage: BigNumberish) => {
    return value.div(
        100
    ).mul(percentage)
}

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

        it('bid with zero price', async () => {
            const marketplace = payload.marketplace;
            const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
            const seller = payload.signer4.address;
            const auctionId = payload.getSellId(
                nftId,
                seller
            );
            const bidAmount = 0;
            const tx = marketplace.placeBid(
                auctionId,
                bidAmount
            );
            await expect(tx).to.revertedWith('New bid price must be higher than current bid');
        })

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
            const buyer = payload.signer2.address;
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

        describe('claim nft jsstore example', async () => {
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

            it('expire auction', async () => {
                const marketplace = payload.marketplace;
                const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
                const seller = payload.signer4.address;
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

            it('refund when bidder exist', async () => {
                const marketplace = payload.marketplace;
                const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
                const seller = payload.signer4.address;
                const auctionId = payload.getSellId(
                    nftId,
                    seller
                );

                const tx = marketplace.refundAuction(auctionId);
                await expect(tx).to.revertedWith('Bider exist for this auction');
            });

            it('successful claim', async () => {

                const erc20Token = payload.erc20Token1;


                const marketplace = payload.marketplace;
                const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
                const seller = payload.signer4.address;
                const auctionId = payload.getSellId(
                    nftId,
                    seller
                );
                const buyer = payload.signer2.address;
                const tokenCreator = await payload.nft.creatorOf(nftId);
                const currentBidAmount = await marketplace.getBidPrice(auctionId);
                const balanceOfMarketplaceBeforeSale = await erc20Token.balanceOf(marketplace.address);
                const balanceOfSellerBeforeSale = await erc20Token.balanceOf(seller);
                const balanceOfCreatorBeforeSale = await erc20Token.balanceOf(tokenCreator);


                const tx = marketplace.claimNFT(auctionId);
                await expect(tx).emit(marketplace, 'NFTClaimed').withArgs(
                    auctionId, nftId,
                    0,
                    currentBidAmount,
                    payload.erc20Token1.address
                );

                // check for marketplace earning

                const earningForMarketplace = getPercentage(currentBidAmount, 2);
                const earningForCreator = getPercentage(currentBidAmount,
                    await payload.nft.creatorCut(
                        nftId
                    )
                );
                const earningForSeller = currentBidAmount.sub(earningForMarketplace.add(
                    earningForCreator
                ));

                const balanceOfMarketplaceAfterSale = await erc20Token.balanceOf(marketplace.address);
                const balanceOfSellerAfterSale = await erc20Token.balanceOf(seller);
                const balanceOfCreatorAfterSale = await erc20Token.balanceOf(tokenCreator);

                expect(balanceOfMarketplaceAfterSale).equal(
                    balanceOfMarketplaceBeforeSale.sub(
                        earningForCreator
                            .add(earningForSeller)
                    )
                );

                expect(balanceOfSellerAfterSale).equal(
                    balanceOfSellerBeforeSale.add(earningForSeller)
                )

                expect(balanceOfCreatorAfterSale).equal(
                    balanceOfCreatorBeforeSale.add(earningForCreator)
                )

                const newOwnerOfNft = await payload.nft.ownerOf(nftId);
                expect(newOwnerOfNft).equal(buyer);

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

            it('refund when claimed', async () => {
                const marketplace = payload.marketplace;
                const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
                const seller = payload.signer4.address;
                const auctionId = payload.getSellId(
                    nftId,
                    seller
                );

                const tx = marketplace.refundAuction(auctionId);
                await expect(tx).to.revertedWith('No auction found');
            });
        })
    });

    describe('successful bid', async () => {

        it('bid with zero price', async () => {
            const marketplace = payload.marketplace;
            const nftId = payload.getProjectId(payload.projects["jsstore"]);
            const seller = payload.deployer.address;
            const auctionId = payload.getSellId(
                nftId,
                seller
            );
            const bidAmount = 0;
            const tx = marketplace.placeBid(
                auctionId,
                bidAmount
            );
            await expect(tx).to.revertedWith('New bid price must be higher than current bid');
        })

        it('bid1', async () => {
            const marketplace = payload.marketplace;
            const nftId = payload.getProjectId(payload.projects["jsstore"]);
            const seller = payload.deployer.address;
            const auctionId = payload.getSellId(
                nftId,
                seller
            );
            const bidAmount = 100001;
            const buyer = payload.signer2.address;
            const balanceOfBuyerBeforeSale = await payload.erc20Token1.balanceOf(
                buyer
            );
            const balanceOfMarketplaceBeforeSale = await payload.erc20Token1.balanceOf(
                marketplace.address
            );
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


            const balanceOfMarketplaceAfterSale = await payload.erc20Token1.balanceOf(
                marketplace.address
            );
            expect(balanceOfMarketplaceAfterSale).equal(
                balanceOfMarketplaceBeforeSale.add(bidAmount)
            )
        })

        it('refund when auction is open', async () => {
            const marketplace = payload.marketplace;
            const nftId = payload.getProjectId(payload.projects["jsstore"]);
            const seller = payload.deployer.address;
            const auctionId = payload.getSellId(
                nftId,
                seller
            );

            const tx = marketplace.refundAuction(auctionId);
            await expect(tx).to.revertedWith('Auction is still open');
        });

        describe('claim nft jsstore', async () => {
            it('when auction is still open', async () => {
                const marketplace = payload.marketplace;
                const nftId = payload.getProjectId(payload.projects["jsstore"]);
                const seller = payload.deployer.address;
                const auctionId = payload.getSellId(
                    nftId,
                    seller
                );

                const tx = marketplace.claimNFT(auctionId);
                await expect(tx).to.revertedWith('Auction is still open');
            });

            it('successful claim', async () => {

                const erc20Token = payload.erc20Token1;

                console.log("timestamp of latest block", await time.latest());
                await mine(100);
                console.log("timestamp of latest block", await time.latest());

                const marketplace = payload.marketplace;
                const nftId = payload.getProjectId(payload.projects["jsstore"]);
                const seller = payload.deployer.address;
                const auctionId = payload.getSellId(
                    nftId,
                    seller
                );
                const buyer = payload.signer2.address;
                const currentBidAmount = await marketplace.getBidPrice(auctionId);
                const balanceOfMarketplaceBeforeSale = await erc20Token.balanceOf(marketplace.address);
                const balanceOfSellerBeforeSale = await erc20Token.balanceOf(seller);
                const shareOfBuyerBeforeSale = await payload.nft.shareOf(nftId, buyer);

                const tx = marketplace.claimNFT(auctionId);
                const shareToTransfer = 100;
                await expect(tx).emit(marketplace, 'NFTClaimed').withArgs(
                    auctionId, nftId,
                    shareToTransfer,
                    currentBidAmount,
                    payload.erc20Token1.address
                );

                // check for marketplace earning

                const earningForMarketplace = getPercentage(currentBidAmount, 2);
                const earningForCreator = getPercentage(currentBidAmount,
                    await payload.nft.creatorCut(
                        nftId
                    )
                );
                const earningForSeller = currentBidAmount.sub(earningForMarketplace.add(
                    earningForCreator
                ));

                const balanceOfMarketplaceAfterSale = await erc20Token.balanceOf(marketplace.address);
                const balanceOfSellerAfterSale = await erc20Token.balanceOf(seller);

                expect(balanceOfMarketplaceAfterSale).equal(
                    balanceOfMarketplaceBeforeSale.sub(
                        earningForCreator
                            .add(earningForSeller)
                    )
                );

                expect(balanceOfSellerAfterSale).equal(
                    balanceOfSellerBeforeSale.add(earningForSeller)
                )

                const shareOfBuyerAfterSale = await payload.nft.shareOf(nftId, buyer);
                expect(shareOfBuyerAfterSale).equal(shareToTransfer + shareOfBuyerBeforeSale);

            });

            it('when auction no exist', async () => {
                const marketplace = payload.marketplace;
                const nftId = payload.getProjectId(payload.projects["jsstore"]);
                const seller = payload.deployer.address;
                const auctionId = payload.getSellId(
                    nftId,
                    seller
                );

                const tx = marketplace.claimNFT(auctionId);
                await expect(tx).to.revertedWith('No auction found');
            });

            it('refund when claimed', async () => {
                const marketplace = payload.marketplace;
                const nftId = payload.getProjectId(payload.projects["jsstore"]);
                const seller = payload.deployer.address;
                const auctionId = payload.getSellId(
                    nftId,
                    seller
                );

                const tx = marketplace.refundAuction(auctionId);
                await expect(tx).to.revertedWith('No auction found');
            });
        })
    });
}