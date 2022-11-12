import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { IDeployedPayload } from "../interfaces";

const getPercentage = (value: BigNumber, percentage: BigNumberish) => {
    return value.div(
        100
    ).mul(percentage)
}

export function testNFTBuy(payload: IDeployedPayload) {
    it('not existing NFT', async () => {
        const marketplace = payload.marketplace;
        const tx = marketplace.buyNFT(
            payload.getSellId(
                payload.getProjectId(payload.projects["jsstore-example"]),
                payload.signer2.address
            ),
            0,
            1000000
        );
        await expect(tx).revertedWith('Require NFT listed');
    });

    it('price less than listed', async () => {
        const marketplace = payload.marketplace;
        const tx = marketplace.buyNFT(
            payload.getSellId(
                payload.getProjectId(payload.projects["jsstore-example"]),
                payload.signer3.address
            ),
            0,
            1000000
        );
        await expect(tx).revertedWith('Price not met');
    });

    it('buy without erc20 allowance of buyer', async () => {
        const marketplace = payload.marketplace;
        const sellId = payload.getSellId(
            payload.getProjectId(payload.projects["jsstore-example"]),
            payload.signer3.address
        );
        const price = (await marketplace.getNFTFromSale(sellId)).price;
        const tx = marketplace.buyNFT(
            sellId,
            0,
            price
        );
        await expect(tx).revertedWith('ERC20: insufficient allowance');
    });



    describe('buy with same price', async () => {
        it('seller is not creator', async () => {
            const marketplace = payload.marketplace;
            const tokenId = payload.getProjectId(payload.projects["jsstore-example"]);
            const seller = payload.signer3.address;
            const sellId = payload.getSellId(
                tokenId,
                seller
            );
            const creatorOf = await payload.nft.creatorOf(tokenId);
            expect(creatorOf).not.equal(seller);
            const percentageOfCreator = await payload.nft.creatorCut(tokenId);

            const price = (await marketplace.getNFTFromSale(sellId)).price;
            const buyer = payload.signer4.address;

            expect(creatorOf).not.equal(buyer);

            await payload.erc20Token1.connect(payload.signer4).approve(
                marketplace.address, ethers.constants.MaxUint256,
            )
            const gas = await marketplace.connect(payload.signer4).estimateGas.buyNFT(
                sellId,
                0,
                price
            );
            expect(gas).equal(174606);

            const paymentTokenAddress = payload.erc20Token1.address;
            const balanceOfBuyerBeforeSale = await payload.erc20Token1.balanceOf(buyer);
            const balanceOfMarketPlaceBeforeSale = await payload.erc20Token1.balanceOf(payload.marketplace.address);
            const balanceOfSellerBeforeSale = await payload.erc20Token1.balanceOf(seller);
            const balanceOfCreatorBeforeSale = await payload.erc20Token1.balanceOf(creatorOf);

            const tx = marketplace.connect(payload.signer4).buyNFT(
                sellId,
                0,
                price
            );
            await expect(tx).emit(payload.marketplace, 'NFTBought').withArgs(
                buyer, tokenId, price, 0
            );

            // check nft owner

            const newOwner = await payload.nft.ownerOf(tokenId);
            expect(newOwner).equal(buyer);

            const earningForMarketplace = getPercentage(price, 2);
            const earningForCreator = getPercentage(price, percentageOfCreator);
            const earningForSeller = getPercentage(price, 100 - percentageOfCreator - 2);

            // check marketplace money

            const balanceOfMarketPlace = await payload.erc20Token1.balanceOf(payload.marketplace.address);
            expect(balanceOfMarketPlace).equal(
                balanceOfMarketPlaceBeforeSale.add(earningForMarketplace)
            );


            const balanceOfSeller = await payload.erc20Token1.balanceOf(seller);
            expect(balanceOfSeller).equal(
                balanceOfSellerBeforeSale.add(earningForSeller)
            );

            const balanceOfCreatorAfterSale = await payload.erc20Token1.balanceOf(creatorOf);

            expect(balanceOfCreatorAfterSale).equal(
                earningForCreator.add(balanceOfCreatorBeforeSale)
            );

            // buyer balance should be deducted

            const balanceOfBuyerAfterBuy = await payload.erc20Token1.balanceOf(buyer);

            expect(balanceOfBuyerAfterBuy).equal(
                balanceOfBuyerBeforeSale.sub(
                    price
                )
            )

            expect(earningForCreator.add(earningForMarketplace).add(earningForSeller)).equal(price);
        });

        it('seller is creator', async () => {
            const marketplace = payload.marketplace;
            const tokenId = payload.getProjectId(payload.projects["mahal-example"]);
            const seller = payload.signer2.address;
            const buyer = payload.deployer.address;

            const sellId = payload.getSellId(
                tokenId,
                seller
            );
            const creatorOf = await payload.nft.creatorOf(tokenId);
            const ownerOf = await payload.nft.ownerOf(tokenId);
            expect(creatorOf).equal(ownerOf);
            expect(creatorOf).equal(seller);

            expect(buyer).not.equal(seller);

            const price = (await marketplace.getNFTFromSale(sellId)).price;

            await payload.erc20Token1.approve(
                marketplace.address, ethers.constants.MaxUint256,
            )

            const gas = await marketplace.estimateGas.buyNFT(
                sellId,
                0,
                price
            );
            expect(gas).equal(138327);

            const balanceOfSellerBeforeSale = await payload.erc20Token1.balanceOf(seller);
            const balanceOfBuyerBeforeSale = await payload.erc20Token1.balanceOf(buyer);
            const balanceOfMarketPlaceBeforeSale = await payload.erc20Token1.balanceOf(payload.marketplace.address);
            const paymentTokenAddress = payload.erc20Token1.address;

            const tx = marketplace.buyNFT(
                sellId,
                0,
                price
            );
            await expect(tx).emit(payload.marketplace, 'NFTBought').withArgs(
                payload.deployer.address, tokenId, price, 0
            );

            // check nft owner

            const newOwner = await payload.nft.ownerOf(tokenId);
            expect(newOwner).equal(payload.deployer.address);

            // check marketplace money

            const earningForMarketplace = getPercentage(price, 2);
            const earningForSeller = price.sub(earningForMarketplace); //getPercentage(price, 98);

            // check marketplace money

            const balanceOfMarketPlace = await payload.erc20Token1.balanceOf(payload.marketplace.address);
            expect(balanceOfMarketPlace).equal(
                earningForMarketplace.add(balanceOfMarketPlaceBeforeSale)
            );

            const balanceOfSeller = await payload.erc20Token1.balanceOf(seller);



            expect(balanceOfSeller).equal(
                earningForSeller.add(balanceOfSellerBeforeSale)
            );



            // buyer balance should be deducted

            const balanceOfBuyerAfterBuy = await payload.erc20Token1.balanceOf(buyer);

            expect(balanceOfBuyerAfterBuy).equal(
                balanceOfBuyerBeforeSale.sub(
                    price
                )
            )

            expect((earningForMarketplace).add(earningForSeller)).equal(price);
        })
    });

    it('buy with greater price than listed', async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(payload.projects["jsstore"]);
        const seller = payload.signer3.address;
        const sellId = payload.getSellId(
            tokenId,
            seller
        );

        const price = (await marketplace.getNFTFromSale(sellId)).price;
        const buyer = payload.signer4.address;

        await payload.erc20Token1.approve(
            marketplace.address, ethers.constants.MaxUint256,
        );

        const gas = await marketplace.estimateGas.buyNFT(
            sellId,
            10,
            price.add(10)
        );
        expect(gas).equal(168611);
    })

    it('buy with zero share', async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(payload.projects["jsstore"]);
        const seller = payload.signer3.address;
        const sellId = payload.getSellId(
            tokenId,
            seller
        );

        const price = (await marketplace.getNFTFromSale(sellId)).price;

        await payload.erc20Token1.approve(
            marketplace.address, ethers.constants.MaxUint256,
        );

        const tx = marketplace.buyNFT(
            sellId,
            0,
            price.add(10)
        );
        await expect(tx).to.revertedWith('Price not met')
    })

    it('buy with share greater than listed', async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(payload.projects["jsstore"]);
        const seller = payload.signer3.address;
        const sellId = payload.getSellId(
            tokenId,
            seller
        );

        const price = (await marketplace.getNFTFromSale(sellId)).price;

        await payload.erc20Token1.approve(
            marketplace.address, ethers.constants.MaxUint256,
        );

        const tx = marketplace.buyNFT(
            sellId,
            1000,
            price
        );
        await expect(tx).to.revertedWith('Input share is greater than listed')
    })

    it('buy share nft - jsstore', async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(payload.projects["jsstore"]);
        const seller = payload.signer3.address;
        const buyer = payload.deployer.address;

        const sellId = payload.getSellId(
            tokenId,
            seller
        );
        expect(buyer).not.equal(seller);

        const sellInfoBeforeSale = await marketplace.getNFTFromSale(sellId);

        const price = sellInfoBeforeSale.price;

        await payload.erc20Token1.approve(
            marketplace.address, ethers.constants.MaxUint256,
        )

        const balanceOfBuyerBeforeSale = await payload.erc20Token1.balanceOf(buyer);
        const balanceOfMarketPlaceBeforeSale = await payload.erc20Token1.balanceOf(marketplace.address);
        const paymentTokenAddress = payload.erc20Token1.address;
        const shareToBuy = 10;
        const shareOfBuyerBeforeSale = await payload.nft.shareOf(tokenId, buyer);
        const shareOfSellerBeforeSale = await payload.nft.shareOf(tokenId, seller);

        const tx = marketplace.buyNFT(
            sellId,
            shareToBuy,
            price
        );
        await expect(tx).emit(payload.marketplace, 'NFTBought').withArgs(
            payload.deployer.address, tokenId, price, shareToBuy
        );


        const sellInfoAfterSale = await marketplace.getNFTFromSale(sellId);

        expect(sellInfoAfterSale.share).equal(
            sellInfoBeforeSale.share - shareToBuy
        )

        // seller share should be deducted
        const shareOfSellerAfterSale = await payload.nft.shareOf(tokenId, seller);
        expect(shareOfSellerAfterSale).equal(
            shareOfSellerBeforeSale - shareToBuy
        );

        // check nft owner

        const shareOfBuyer = await payload.nft.shareOf(tokenId, buyer);
        expect(shareOfBuyer).equal(
            shareOfBuyerBeforeSale + shareToBuy
        );

        // check marketplace money
        const totalPrice = price.mul(shareToBuy);
        const earningForMarketplace = getPercentage(totalPrice, 2);
        const earningForSeller = totalPrice.sub(earningForMarketplace); //getPercentage(price, 98);

        // check marketplace money

        const balanceOfMarketPlace = await payload.erc20Token1.balanceOf(payload.marketplace.address);
        console.log('balanceOfMarketPlace', balanceOfMarketPlace);
        console.log('earningForMarketplace', earningForMarketplace);
        console.log('balanceOfMarketPlaceBeforeSale', balanceOfMarketPlaceBeforeSale);
        expect(balanceOfMarketPlace).equal(
            earningForMarketplace.add(balanceOfMarketPlaceBeforeSale)
        );

        const balanceOfSeller = await payload.erc20Token1.balanceOf(seller);

        expect(balanceOfSeller).equal(
            earningForSeller
        );

        // buyer balance should be deducted

        const balanceOfBuyerAfterBuy = await payload.erc20Token1.balanceOf(buyer);

        expect(balanceOfBuyerAfterBuy).equal(
            balanceOfBuyerBeforeSale.sub(
                price.mul(shareToBuy)
            )
        )

        expect((earningForMarketplace).add(earningForSeller)).equal(totalPrice);
    })

}