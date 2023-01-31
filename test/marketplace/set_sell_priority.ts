import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { IDeployedPayload } from "../interfaces";

export function testSetSellPriority(payload: IDeployedPayload) {

    describe("auction sale priority set", () => {
        it('successful auction for jsstore example', async () => {
            const marketplace = payload.marketplace;
            const projectId = payload.getProjectId(
                payload.projects["jsstore-example"]
            );
            const seller = payload.signer2.address;
            const endAuction = (await time.latest()) + 200;
            const tx = await marketplace.connect(payload.signer2).createAuction(
                {
                    tokenId: projectId,
                    share: 0,
                    initialBid: 1000,
                    paymentToken: payload.erc20Token1.address,
                    sellPriority: 1,
                    endAuction: endAuction
                }
            );
            const auctionId = payload.getSellId(projectId, seller);
            payload.transactions['sellJsStoreExamples'].push({
                txHash: await tx.hash,
                "expires": endAuction
            });
        });

        describe("update sellPriority", () => {

            it('Require NFT listed', async () => {
                const marketplace = payload.marketplace;
                const projectId = payload.getProjectId(
                    payload.projects["jsstore-example"]
                );
                const seller = payload.signer4.address;

                const sellId = payload.getSellId(projectId, seller);

                const tx = marketplace.connect(payload.signer4).setAuctionSellPriority(
                    sellId,
                    10,
                );

                await expect(tx).to.revertedWith('no_auction_found');
            })

            it('non owner', async () => {
                const marketplace = payload.marketplace;
                const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
                const seller = payload.signer2.address;
                const auctionId = payload.getSellId(
                    nftId,
                    seller
                );

                const tx = marketplace.connect(payload.signer4).setAuctionSellPriority(
                    auctionId,
                    10
                );
                await expect(tx).to.revertedWith('require_caller_tobe_seller');
            })

            it('sell_priority_should_be_above_equal_current_sell_priority', async () => {
                const marketplace = payload.marketplace;
                const projectId = payload.getProjectId(
                    payload.projects["jsstore-example"]
                );
                const seller = payload.signer2.address;
                const sellId = payload.getSellId(projectId, seller);

                const gasForPrioritySale = marketplace.connect(payload.signer2).setAuctionSellPriority(
                    sellId,
                    1
                );

                await expect(gasForPrioritySale).revertedWith(`sell_priority_should_be_above_current_sell_priority`)
            })

            it('gas estimate', async () => {
                const marketplace = payload.marketplace;
                const projectId = payload.getProjectId(
                    payload.projects["jsstore-example"]
                );
                const seller = payload.signer2.address;
                const sellId = payload.getSellId(projectId, seller);

                const gasForPrioritySale = await marketplace.connect(payload.signer2).estimateGas.setAuctionSellPriority(
                    sellId,
                    10
                );

                expect(gasForPrioritySale).equal(86601);
            })

            it('success', async () => {
                const marketplace = payload.marketplace;
                const projectId = payload.getProjectId(
                    payload.projects["jsstore-example"]
                );
                const seller = payload.signer2.address;
                const sellId = payload.getSellId(projectId, seller);

                const nativeCoin = payload.nativeToken;
                const from = seller;
                const nativeCoinBalance = await nativeCoin.balanceOf(from);
                const sellPriority = 54;

                const nftSaleInfoBefore = await marketplace.getAuction(sellId);
                expect(nftSaleInfoBefore.sellPriority).lessThan(sellPriority);

                const tx = marketplace.connect(payload.signer2).setAuctionSellPriority(
                    sellId,
                    sellPriority
                );

                await expect(tx).to.emit(marketplace, 'SellPriorityUpdate').withArgs(
                    sellId, sellPriority,
                    nftSaleInfoBefore.sellTimestamp
                );

                const nftSaleInfo = await marketplace.getAuction(sellId);

                expect(nftSaleInfo.currentBidPrice).equal(1000);
                expect(nftSaleInfo.paymentToken).equal(payload.erc20Token1.address);
                expect(nftSaleInfo.share).equal(0);
                expect(nftSaleInfo.sellPriority).equal(sellPriority);

                const nativeCoinBalanceAfter = await nativeCoin.balanceOf(from);
                const expectedDeduction = BigNumber.from(10).pow(15).mul(sellPriority - nftSaleInfoBefore.sellPriority);
                expect(nativeCoinBalanceAfter).equal(
                    nativeCoinBalance.sub(expectedDeduction)
                )

                payload.transactions['sellPriorityJsStoreExamples'].push(
                    (await tx).hash
                )
            })

            it('refund NFT', async () => {

                await mine(200);

                const marketplace = payload.marketplace;
                const nftId = payload.getProjectId(
                    payload.projects["jsstore-example"]
                );
                const seller = payload.signer2.address;
                const auctionId = payload.getSellId(
                    nftId,
                    seller
                );
                const tx = marketplace.refundAuction(auctionId);
                const auctionInfo = await marketplace.getAuction(auctionId);

                await expect(tx).emit(marketplace, 'Refund').withArgs(
                    auctionId, auctionInfo.sellTimestamp
                )

                payload.transactions.refundAuctionJsStoreExamples.push(
                    (await tx).hash
                );
            });

        })


    })

    describe("general sell", () => {

        it('successful sale for jsstore example', async () => {
            const marketplace = payload.marketplace;
            const projectId = payload.getProjectId(
                payload.projects["jsstore-example"]
            );
            const seller = payload.signer2.address;

            const tx = await marketplace.connect(payload.signer2).sell(
                {
                    tokenId: projectId,
                    share: 0,
                    price: 1000,
                    paymentToken: payload.erc20Token1.address,
                    sellPriority: 1
                }
            );
            const auctionId = payload.getSellId(projectId, seller);
            payload.transactions['sellJsStoreExamples'].push(
                await tx.hash
            )
        });

        describe("update sellPriority", () => {

            it('Require NFT listed', async () => {
                const marketplace = payload.marketplace;
                const projectId = payload.getProjectId(
                    payload.projects["jsstore-example"]
                );
                const seller = payload.signer4.address;

                const sellId = payload.getSellId(projectId, seller);

                const tx = marketplace.connect(payload.signer4).setSellPriority(
                    sellId,
                    10,
                );

                await expect(tx).to.revertedWith('require_on_sale');
            })


            it('sell_priority_should_be_above_equal_current_sell_priority', async () => {
                const marketplace = payload.marketplace;
                const projectId = payload.getProjectId(
                    payload.projects["jsstore-example"]
                );
                const seller = payload.signer2.address;
                const sellId = payload.getSellId(projectId, seller);

                const gasForPrioritySale = marketplace.connect(payload.signer2).setSellPriority(
                    sellId,
                    1
                );

                await expect(gasForPrioritySale).revertedWith(`sell_priority_should_be_above_current_sell_priority`)
            })

            it('gas estimate', async () => {
                const marketplace = payload.marketplace;
                const projectId = payload.getProjectId(
                    payload.projects["jsstore-example"]
                );
                const seller = payload.signer2.address;
                const sellId = payload.getSellId(projectId, seller);

                const gasForPrioritySale = await marketplace.connect(payload.signer2).estimateGas.setSellPriority(
                    sellId,
                    10
                );

                expect(gasForPrioritySale).equal(74770);
            })

            it('non owner should be success', async () => {
                const marketplace = payload.marketplace;
                const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
                const seller = payload.signer2.address;
                const sellId = payload.getSellId(
                    nftId,
                    seller
                );
                const sellPriority = 10;

                const nftSaleInfoBefore = await marketplace.getSell(sellId);
                expect(nftSaleInfoBefore.sellPriority).lessThan(sellPriority);

                const nativeCoin = payload.nativeToken;
                const from = payload.signer4.address;
                const nativeCoinBalance = await nativeCoin.balanceOf(from);

                const tx = marketplace.connect(payload.signer4).setSellPriority(sellId,
                    sellPriority
                );

                await expect(tx).to.emit(marketplace, 'SellPriorityUpdate').withArgs(
                    sellId, sellPriority,
                    nftSaleInfoBefore.sellTimestamp
                );

                const nftSaleInfo = await marketplace.getSell(sellId);

                expect(nftSaleInfo.price).equal(1000);
                expect(nftSaleInfo.paymentToken).equal(payload.erc20Token1.address);
                expect(nftSaleInfo.share).equal(0);
                expect(nftSaleInfo.sellPriority).equal(sellPriority);


                const nativeCoinBalanceAfter = await nativeCoin.balanceOf(from);
                const expectedDeduction = BigNumber.from(10).pow(15).mul(sellPriority - nftSaleInfoBefore.sellPriority);
                expect(nativeCoinBalanceAfter).equal(
                    nativeCoinBalance.sub(expectedDeduction)
                )

                payload.transactions['sellPriorityJsStoreExamples'].push(
                    (await tx).hash
                )

            })

            it('success', async () => {
                const marketplace = payload.marketplace;
                const projectId = payload.getProjectId(
                    payload.projects["jsstore-example"]
                );
                const seller = payload.signer2.address;
                const sellId = payload.getSellId(projectId, seller);

                const nativeCoin = payload.nativeToken;
                const from = seller;
                const nativeCoinBalance = await nativeCoin.balanceOf(from);
                const sellPriority = 101;

                const nftSaleInfoBefore = await marketplace.getSell(sellId);
                expect(nftSaleInfoBefore.sellPriority).lessThan(sellPriority);

                const tx = marketplace.connect(payload.signer2).setSellPriority(
                    sellId,
                    sellPriority
                );

                await expect(tx).to.emit(marketplace, 'SellPriorityUpdate').withArgs(
                    sellId, sellPriority,
                    nftSaleInfoBefore.sellTimestamp
                );

                const nftSaleInfo = await marketplace.getSell(sellId);

                expect(nftSaleInfo.price).equal(1000);
                expect(nftSaleInfo.paymentToken).equal(payload.erc20Token1.address);
                expect(nftSaleInfo.share).equal(0);
                expect(nftSaleInfo.sellPriority).equal(sellPriority);

                const nativeCoinBalanceAfter = await nativeCoin.balanceOf(from);
                const expectedDeduction = BigNumber.from(10).pow(15).mul(sellPriority - nftSaleInfoBefore.sellPriority);
                expect(nativeCoinBalanceAfter).equal(
                    nativeCoinBalance.sub(expectedDeduction)
                )

                payload.transactions['sellPriorityJsStoreExamples'].push(
                    (await tx).hash
                )
            })
        })
    })

}