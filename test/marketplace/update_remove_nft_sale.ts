import { expect } from "chai";
import { BigNumber } from "ethers";
import { IDeployedPayload } from "../interfaces";

export function testRemoveSale(payload: IDeployedPayload) {

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
    });

    describe("updaye nft", () => {

        it('Require NFT listed', async () => {
            const marketplace = payload.marketplace;
            const projectId = payload.getProjectId(
                payload.projects["jsstore-example"]
            );
            const seller = payload.signer4.address;

            const sellId = payload.getSellId(projectId, seller);

            const tx = marketplace.connect(payload.signer4).updateNFTOnSale(
                sellId,
                {
                    share: 100,
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

            const tx = marketplace.connect(payload.signer4).updateNFTOnSale(auctionId,
                {
                    share: 100,
                    price: 10000,
                    paymentToken: payload.erc20Token2.address,
                    sellPriority: 10,
                });
            await expect(tx).to.revertedWith('require_caller_tobe_seller');
        })

        it('share greater than owns', async () => {
            const marketplace = payload.marketplace;
            const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
            const seller = payload.signer2.address;
            const auctionId = payload.getSellId(
                nftId,
                seller
            );

            const shareOfOwner = payload.nft.shareOf(nftId, seller);
            console.log('shareOfOwner', shareOfOwner);

            const tx = marketplace.connect(payload.signer2).updateNFTOnSale(auctionId,
                {
                    share: 101,
                    price: 0,
                    paymentToken: payload.erc20Token1.address,
                    sellPriority: 10,
                });
            await expect(tx).to.revertedWith('require_input_share_zero');
        })

        it('price must be above zero', async () => {
            const marketplace = payload.marketplace;
            const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
            const seller = payload.signer2.address;
            const auctionId = payload.getSellId(
                nftId,
                seller
            );

            const tx = marketplace.connect(payload.signer2).updateNFTOnSale(auctionId,
                {
                    share: 0,
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

            const tx = marketplace.connect(payload.signer2).updateNFTOnSale(auctionId,
                {
                    share: 0,
                    price: 10000,
                    paymentToken: payload.deployer.address,
                    sellPriority: 10,
                });
            await expect(tx).to.revertedWith('invalid_payment_token');
        })

        it('gas estimate', async () => {
            const marketplace = payload.marketplace;
            const projectId = payload.getProjectId(
                payload.projects["jsstore-example"]
            );
            const seller = payload.signer2.address;
            const sellId = payload.getSellId(projectId, seller);
            const gas = await marketplace.connect(payload.signer2).estimateGas.updateNFTOnSale(
                sellId,
                {
                    share: 0,
                    price: 10000,
                    paymentToken: payload.erc20Token2.address,
                    sellPriority: 10,
                }
            );

            expect(gas).within(115864, 115874);
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
            const sellPriority = 10;
            const nftSaleInfoBefore = await marketplace.getSell(sellId);
            expect(nftSaleInfoBefore.sellPriority).lessThan(sellPriority);

            const tx = marketplace.connect(payload.signer2).updateNFTOnSale(
                sellId,
                {
                    share: 0,
                    price: 10000,
                    paymentToken: payload.erc20Token2.address,
                    sellPriority: sellPriority,
                }
            );

            await expect(tx).to.emit(marketplace, 'SaleUpdated').withArgs(
                sellId, 0, 10000,
                payload.erc20Token2.address, sellPriority
            );

            const nftSaleInfo = await marketplace.getSell(sellId);

            expect(nftSaleInfo.price).equal(10000);
            expect(nftSaleInfo.paymentToken).equal(payload.erc20Token2.address);
            expect(nftSaleInfo.share).equal(0);
            expect(nftSaleInfo.sellPriority).equal(10);

            const nativeCoinBalanceAfter = await nativeCoin.balanceOf(from);
            const expectedDeduction = BigNumber.from(10).pow(15).mul(sellPriority - nftSaleInfoBefore.sellPriority);
            expect(nativeCoinBalanceAfter).equal(
                nativeCoinBalance.sub(expectedDeduction)
            )
        })

    });

    describe("update sellPriority", () => {

        it('Require NFT listed', async () => {
            const marketplace = payload.marketplace;
            const projectId = payload.getProjectId(
                payload.projects["jsstore-example"]
            );
            const seller = payload.signer4.address;

            const sellId = payload.getSellId(projectId, seller);

            const tx = marketplace.connect(payload.signer4).updateSellPriority(
                sellId,
                10,
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

            const tx = marketplace.connect(payload.signer4).updateSellPriority(auctionId,
                10);
            await expect(tx).to.revertedWith('require_nft_owner');
        })

        it('gas estimate', async () => {
            const marketplace = payload.marketplace;
            const projectId = payload.getProjectId(
                payload.projects["jsstore-example"]
            );
            const seller = payload.signer2.address;
            const sellId = payload.getSellId(projectId, seller);

            const gasForPrioritySale = await marketplace.connect(payload.signer2).estimateGas.updateSellPriority(
                sellId,
                10
            );

            expect(gasForPrioritySale).equal(65122);
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

            const tx = marketplace.connect(payload.signer2).updateSellPriority(
                sellId,
                sellPriority
            );

            await expect(tx).to.emit(marketplace, 'SalePriorityUpdated').withArgs(
                sellId, sellPriority
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
    })

    describe("remove from sale", () => {

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

            const tx = marketplace.connect(payload.signer4).removeNFTSale(auctionId);
            await expect(tx).to.revertedWith('require_caller_tobe_seller');
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

            await expect(tx).emit(marketplace, 'SaleCanceled').withArgs(
                sellId, projectId, seller
            );
        });

    })

}