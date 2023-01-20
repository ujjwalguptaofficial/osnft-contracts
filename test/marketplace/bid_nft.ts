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
        await expect(tx).revertedWith('no_auction_found');
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
        await expect(tx).revertedWith('require_newbid_above_currentbid');
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
        await expect(tx).revertedWith('require_newbid_above_currentbid');
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
        await expect(tx).revertedWith('require_bidder_not_creator');
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
            await expect(tx).to.revertedWith('require_newbid_above_currentbid');
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
            await expect(tx).emit(marketplace, 'Bid').withArgs(
                auctionId,
                buyer,
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

            const auction = await marketplace.getAuction(auctionId);

            const expectedAuction = {
                tokenId: nftId,
                share: 0,
                seller: seller,
                paymentToken: payload.erc20Token1.address, // Address of the ERC20 Payment Token contract
                currentBidOwner: buyer, // Address of the highest bider
                currentBidPrice: bidPrice, // Current highest bid for the auction
                endAuction: auction.endAuction, // Timestamp for the end day&time of the auction
                // bidCount: 1 //
            };
            for (const prop in expectedAuction) {
                expect((expectedAuction as any)[prop]).equal((auction as any)[prop]);
            }

            payload.transactions['bidJsStoreExamples'].push(
                (await tx).hash
            )
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
            await expect(tx).to.revertedWith('require_newbid_above_currentbid');
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
            await expect(tx).emit(marketplace, 'Bid').withArgs(
                auctionId,
                buyer,
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

            payload.transactions['bidJsStoreExamples'].push(
                (await tx).hash
            )

            const auction = await marketplace.getAuction(auctionId);

            const expectedAuction = {
                tokenId: nftId,
                share: 0,
                seller: seller,
                paymentToken: payload.erc20Token1.address, // Address of the ERC20 Payment Token contract
                currentBidOwner: buyer, // Address of the highest bider
                currentBidPrice: bidPrice, // Current highest bid for the auction
                endAuction: auction.endAuction, // Timestamp for the end day&time of the auction
                // bidCount: 2 //
            };
            for (const prop in expectedAuction) {
                expect((expectedAuction as any)[prop]).equal((auction as any)[prop]);
            }

            payload.transactions['bidJsStoreExamples'].push(
                (await tx).hash
            )
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
                await expect(tx).to.revertedWith('require_auction_close');
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
                await expect(tx).to.revertedWith('require_no_bidder');
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
                await expect(tx).emit(marketplace, 'Claim').withArgs(
                    auctionId,
                    currentBidAmount,
                    seller
                );
                await expect(tx).emit(payload.nft, 'Transfer').withArgs(
                    payload.marketplace.address,
                    buyer,
                    nftId
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

                payload.transactions['claimJsStoreExample'] = (await tx).hash;

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
                await expect(tx).to.revertedWith('no_auction_found');
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
                await expect(tx).to.revertedWith('no_auction_found');
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
            await expect(tx).to.revertedWith('require_newbid_above_currentbid');
        })

        it('bid1', async () => {
            const marketplace = payload.marketplace;
            const nftId = payload.getProjectId(payload.projects["jsstore"]);
            const seller = payload.deployer.address;
            const auctionId = payload.getSellId(
                nftId,
                seller
            );
            const bidAmount = 1000001;
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
            await expect(tx).emit(marketplace, 'Bid').withArgs(
                auctionId,
                buyer,
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

            payload.transactions['bidJsStore'].push(
                (await tx).hash
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
            await expect(tx).to.revertedWith('require_auction_close');
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
                await expect(tx).to.revertedWith('require_auction_close');
            });

            it('expect isSellActive true', async () => {
                const tokenId = payload.getProjectId(payload.projects["jsstore"]);
                const from = payload.deployer.address;
                const marketplace = payload.marketplace;
                const sellId = payload.getSellId(tokenId, from);
                const isSellActive = await marketplace.isSellActive(sellId);

                expect(isSellActive).equal(true);

            })

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
                await expect(tx).emit(marketplace, 'Claim').withArgs(
                    auctionId,
                    currentBidAmount,
                    seller
                );

                await expect(tx).emit(payload.nft, 'Transfer').withArgs(
                    payload.marketplace.address,
                    buyer,
                    nftId
                );
                await expect(tx).emit(payload.nft, 'TransferShare').withArgs(
                    shareToTransfer
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

                const auction = await marketplace.getAuction(auctionId);

                const expectedAuction = {
                    tokenId: '0x0000000000000000000000000000000000000000000000000000000000000000',
                    share: 0,
                    seller: ethers.constants.AddressZero,
                    paymentToken: ethers.constants.AddressZero, // Address of the ERC20 Payment Token contract
                    currentBidOwner: ethers.constants.AddressZero, // Address of the highest bider
                    currentBidPrice: 0, // Current highest bid for the auction
                    endAuction: 0, // Timestamp for the end day&time of the auction
                    // bidCount: 0 //
                };
                for (const prop in expectedAuction) {
                    expect((expectedAuction as any)[prop]).equal((auction as any)[prop]);
                }

                payload.transactions['claimJsStore'] = (await tx).hash;
            });


            it('expect isSellActive false', async () => {
                const tokenId = payload.getProjectId(payload.projects["jsstore"]);
                const from = payload.deployer.address;
                const marketplace = payload.marketplace;
                const sellId = payload.getSellId(tokenId, from);
                const isSellActive = await marketplace.isSellActive(sellId);

                expect(isSellActive).equal(false);
            })

            it('when auction no exist', async () => {
                const marketplace = payload.marketplace;
                const nftId = payload.getProjectId(payload.projects["jsstore"]);
                const seller = payload.deployer.address;
                const auctionId = payload.getSellId(
                    nftId,
                    seller
                );

                const tx = marketplace.claimNFT(auctionId);
                await expect(tx).to.revertedWith('no_auction_found');
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
                await expect(tx).to.revertedWith('no_auction_found');
            });
        })
    });
}