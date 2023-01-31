import { expect } from "chai";
import { BigNumber } from "ethers";
import { IDeployedPayload } from "../interfaces";

export function testRemoveSale(payload: IDeployedPayload) {

    describe("update nft", () => {

        it('Require NFT listed', async () => {
            const marketplace = payload.marketplace;
            const projectId = payload.getProjectId(
                payload.projects["jsstore-example"]
            );
            const seller = payload.signer4.address;

            const sellId = payload.getSellId(projectId, seller);

            const tx = marketplace.connect(payload.signer4).updateSell(
                sellId,
                {
                    price: 10000,
                    paymentToken: payload.erc20Token2.address,
                    sellPriority: 10,
                }
            );

            await expect(tx).to.revertedWith('require_on_sale');
        })

        it('non owner', async () => {
            const marketplace = payload.marketplace;
            const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
            const seller = payload.signer2.address;
            const auctionId = payload.getSellId(
                nftId,
                seller
            );

            const tx = marketplace.connect(payload.signer4).updateSell(auctionId,
                {
                    price: 10000,
                    paymentToken: payload.erc20Token2.address,
                    sellPriority: 10,
                });
            await expect(tx).to.revertedWith('require_caller_tobe_seller');
        })

        // it('share greater than owns', async () => {
        //     const marketplace = payload.marketplace;
        //     const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
        //     const seller = payload.signer2.address;
        //     const auctionId = payload.getSellId(
        //         nftId,
        //         seller
        //     );

        //     const shareOfOwner = payload.nft.shareOf(nftId, seller);
        //     console.log('shareOfOwner', shareOfOwner);

        //     const tx = marketplace.connect(payload.signer2).updateSell(auctionId,
        //         {
        //             price: 0,
        //             paymentToken: payload.erc20Token1.address,
        //             sellPriority: 10,
        //         });
        //     await expect(tx).to.revertedWith('require_input_share_zero');
        // })

        it('price must be above zero', async () => {
            const marketplace = payload.marketplace;
            const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
            const seller = payload.signer2.address;
            const auctionId = payload.getSellId(
                nftId,
                seller
            );

            const tx = marketplace.connect(payload.signer2).updateSell(auctionId,
                {
                    price: 0,
                    paymentToken: payload.erc20Token1.address,
                    sellPriority: 10,
                });
            await expect(tx).to.revertedWith('require_price_above_zero');
        })

        it('require payable token', async () => {
            const marketplace = payload.marketplace;
            const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
            const seller = payload.signer2.address;
            const auctionId = payload.getSellId(
                nftId,
                seller
            );

            const tx = marketplace.connect(payload.signer2).updateSell(auctionId,
                {
                    price: 10000,
                    paymentToken: payload.deployer.address,
                    sellPriority: 10,
                });
            await expect(tx).to.revertedWith('invalid_payment_token');
        })

        it('sell_priority_should_be_above_equal_current_sell_priority', async () => {
            const marketplace = payload.marketplace;
            const projectId = payload.getProjectId(
                payload.projects["jsstore-example"]
            );
            const seller = payload.signer2.address;
            const sellId = payload.getSellId(projectId, seller);
            const tx = marketplace.connect(payload.signer2).updateSell(
                sellId,
                {
                    price: 10000,
                    paymentToken: payload.erc20Token2.address,
                    sellPriority: 100,
                }
            );

            await expect(tx).to.revertedWith('sell_priority_should_be_above_equal_current_sell_priority');

        })

        it('gas estimate', async () => {
            const marketplace = payload.marketplace;
            const projectId = payload.getProjectId(
                payload.projects["jsstore-example"]
            );
            const seller = payload.signer2.address;
            const sellId = payload.getSellId(projectId, seller);
            const gas = await marketplace.connect(payload.signer2).estimateGas.updateSell(
                sellId,
                {
                    price: 10000,
                    paymentToken: payload.erc20Token2.address,
                    sellPriority: 101,
                }
            );

            expect(gas).within(53340, 53345);
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
            const sellPriority = 110;
            const nftSaleInfoBefore = await marketplace.getSell(sellId);
            expect(nftSaleInfoBefore.sellPriority).lessThan(sellPriority);

            const tx = marketplace.connect(payload.signer2).updateSell(
                sellId,
                {
                    price: 10000,
                    paymentToken: payload.erc20Token2.address,
                    sellPriority: sellPriority,
                }
            );

            await expect(tx).to.emit(marketplace, 'SellUpdate').withArgs(
                sellId, 10000,
                payload.erc20Token2.address,
                sellPriority,
                nftSaleInfoBefore.sellTimestamp
            );

            const nftSaleInfo = await marketplace.getSell(sellId);

            expect(nftSaleInfo.price).equal(10000);
            expect(nftSaleInfo.paymentToken).equal(payload.erc20Token2.address);
            expect(nftSaleInfo.share).equal(0);
            expect(nftSaleInfo.sellPriority).equal(sellPriority);

            const nativeCoinBalanceAfter = await nativeCoin.balanceOf(from);
            const expectedDeduction = BigNumber.from(10).pow(15).mul(sellPriority - nftSaleInfoBefore.sellPriority);
            expect(nativeCoinBalanceAfter).equal(
                nativeCoinBalance.sub(expectedDeduction)
            )
        })

    });

    describe("remove from sale", () => {

        it('remove for not existing auction', async () => {
            const marketplace = payload.marketplace;
            const projectId = payload.getProjectId(
                payload.projects["jsstore-example"]
            );
            const seller = payload.signer4.address;

            const sellId = payload.getSellId(projectId, seller);

            const tx = marketplace.connect(payload.signer4).removeSell(
                sellId
            );

            await expect(tx).to.revertedWith('require_on_sale');
        })

        it('remove by non owner', async () => {
            const marketplace = payload.marketplace;
            const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
            const seller = payload.signer2.address;
            const auctionId = payload.getSellId(
                nftId,
                seller
            );

            const tx = marketplace.connect(payload.signer4).removeSell(auctionId);
            await expect(tx).to.revertedWith('require_caller_tobe_seller');
        })

        it('successful remove', async () => {
            const marketplace = payload.marketplace;
            const projectId = payload.getProjectId(
                payload.projects["jsstore-example"]
            );
            const seller = payload.signer2.address;
            const sellId = payload.getSellId(projectId, seller);

            const ownerOfNftBefore = await payload.nft.ownerOf(projectId);
            expect(ownerOfNftBefore).equal(marketplace.address);

            const sellInfo = await marketplace.getSell(sellId);

            const tx = marketplace.connect(payload.signer2).removeSell(
                sellId
            );

            await expect(tx).emit(marketplace, 'SellCancel').withArgs(
                sellId, projectId, seller, sellInfo.sellTimestamp
            );

            const ownerOfNftAfter = await payload.nft.ownerOf(projectId);
            expect(ownerOfNftAfter).equal(seller);
        });

    })

}