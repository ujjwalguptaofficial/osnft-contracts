import { expect } from "chai";
import { IDeployedPayload } from "../interfaces";

export function testRemoveSale(payload: IDeployedPayload) {

    it('successful sale for jsstore example', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const seller = payload.signer2.address;

        const tx = await marketplace.connect(payload.signer2).listNFTOnSale(
            {
                tokenId: projectId,
                share: 0,
                price: 1000,
                paymentToken: payload.erc20Token1.address,
                sellPriority: 0
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

            await expect(tx).to.revertedWith('Require NFT listed');
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
            await expect(tx).to.revertedWith('Require NFT ownership');
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
                    share: 100,
                    price: 0,
                    paymentToken: payload.erc20Token1.address,
                    sellPriority: 10,
                });
            await expect(tx).to.revertedWith('Price must be above zero');
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
                    share: 100,
                    price: 10000,
                    paymentToken: payload.deployer.address,
                    sellPriority: 10,
                });
            await expect(tx).to.revertedWith('Invalid payment token');
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
                    share: 100,
                    price: 10000,
                    paymentToken: payload.erc20Token2.address,
                    sellPriority: 10,
                }
            );

            expect(gas).equal(134239);
        })

        it('success', async () => {
            const marketplace = payload.marketplace;
            const projectId = payload.getProjectId(
                payload.projects["jsstore-example"]
            );
            const seller = payload.signer2.address;
            const sellId = payload.getSellId(projectId, seller);
            const tx = marketplace.connect(payload.signer2).updateNFTOnSale(
                sellId,
                {
                    share: 100,
                    price: 10000,
                    paymentToken: payload.erc20Token2.address,
                    sellPriority: 10,
                }
            );

            await expect(tx).to.emit(marketplace, 'NFTSaleUpdated').withArgs(
                sellId, 100, 10000,
                payload.erc20Token2.address, 10
            );

            const nftSaleInfo = await marketplace.getNFTFromSale(sellId);

            expect(nftSaleInfo.price).equal(10000);
            expect(nftSaleInfo.paymentToken).equal(payload.erc20Token2.address);
            expect(nftSaleInfo.share).equal(100);
            expect(nftSaleInfo.sellPriority).equal(10);
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

            const tx = marketplace.connect(payload.signer4).updateSellPriorityOnSale(
                sellId,
                10,
            );

            await expect(tx).to.revertedWith('Require NFT listed');
        })

        it('non owner', async () => {
            const marketplace = payload.marketplace;
            const nftId = payload.getProjectId(payload.projects["jsstore-example"]);
            const seller = payload.signer2.address;
            const auctionId = payload.getSellId(
                nftId,
                seller
            );

            const tx = marketplace.connect(payload.signer4).updateSellPriorityOnSale(auctionId,
                10);
            await expect(tx).to.revertedWith('Require NFT ownership');
        })

        it('gas estimate', async () => {
            const marketplace = payload.marketplace;
            const projectId = payload.getProjectId(
                payload.projects["jsstore-example"]
            );
            const seller = payload.signer2.address;
            const sellId = payload.getSellId(projectId, seller);

            const gasForPrioritySale = await marketplace.connect(payload.signer2).estimateGas.updateSellPriorityOnSale(
                sellId,
                10
            );

            expect(gasForPrioritySale).equal(107110);
        })

        it('success', async () => {
            const marketplace = payload.marketplace;
            const projectId = payload.getProjectId(
                payload.projects["jsstore-example"]
            );
            const seller = payload.signer2.address;
            const sellId = payload.getSellId(projectId, seller);
            const tx = marketplace.connect(payload.signer2).updateSellPriorityOnSale(
                sellId,
                101
            );

            await expect(tx).to.emit(marketplace, 'NFTSaleSellPriorityUpdated').withArgs(
                sellId, 101
            );

            const nftSaleInfo = await marketplace.getNFTFromSale(sellId);

            expect(nftSaleInfo.price).equal(10000);
            expect(nftSaleInfo.paymentToken).equal(payload.erc20Token2.address);
            expect(nftSaleInfo.share).equal(100);
            expect(nftSaleInfo.sellPriority).equal(101);
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

            await expect(tx).to.revertedWith('Require NFT listed');
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
            await expect(tx).to.revertedWith('Require NFT ownership');
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

    })

}