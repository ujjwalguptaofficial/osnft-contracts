import { expect } from "chai";
import { BigNumber } from "ethers";
import { IDeployedPayload } from "../interfaces";

export function testSetSellPriority(payload: IDeployedPayload) {

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

        it('non owner', async () => {
            const marketplace = payload.marketplace;
            const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
            const seller = payload.signer2.address;
            const auctionId = payload.getSellId(
                nftId,
                seller
            );

            const tx = marketplace.connect(payload.signer4).setSellPriority(auctionId,
                10);
            await expect(tx).to.revertedWith('require_caller_tobe_seller');
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

            expect(gasForPrioritySale).equal(77133);
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
        })
    })

}