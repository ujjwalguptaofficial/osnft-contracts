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

            console.log('creatorOf', creatorOf)
            console.log('seller', seller)
            const percentageOfCreator = await payload.nft.creatorCut(tokenId);
            console.log('percentageof', percentageOfCreator);

            const balanceOfCreatorBeforeSale = await payload.erc20Token1.balanceOf(creatorOf);

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
            expect(gas).equal(242129);

            const balanceOfBuyerBeforeSale = await payload.erc20Token1.balanceOf(buyer);

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
            const paymentTokenAddress = payload.erc20Token1.address;

            // check marketplace money

            const balanceOfMarketPlace = await payload.erc20Token1.balanceOf(payload.marketplace.address);
            expect(balanceOfMarketPlace).equal(
                price
            );


            const balanceOfSeller = await marketplace.balanceOf(seller, paymentTokenAddress);
            expect(balanceOfSeller).equal(
                earningForSeller
            );

            const balanceOfCreatorAfterSale = await marketplace.balanceOf(creatorOf, paymentTokenAddress);

            expect(balanceOfCreatorAfterSale).equal(
                earningForCreator
            );

            // buyer balance should be deducted

            const balanceOfBuyerAfterBuy = await payload.erc20Token1.balanceOf(buyer);
            console.log('balanceOfBuyerBeforeSale', balanceOfBuyerBeforeSale);
            console.log('balanceOfBuyerAfterBuy', balanceOfBuyerAfterBuy);
            console.log('price', price);
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
            expect(gas).equal(157801);

            const balanceOfBuyerBeforeSale = await payload.erc20Token1.balanceOf(buyer);
            const balanceOfMarketPlaceBeforeSale = await payload.erc20Token1.balanceOf(payload.marketplace.address);
            const balanceOfSellerBeforeSale = await payload.erc20Token1.balanceOf(seller);
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
                price.add(balanceOfMarketPlaceBeforeSale)
            );

            const balanceOfSeller = await marketplace.balanceOf(seller, paymentTokenAddress);

            console.log('balanceOfSellerBeforeSale', balanceOfSellerBeforeSale);
            console.log('balanceOfSeller', balanceOfSeller);
            console.log('earningForSeller', earningForSeller);

            expect(balanceOfSeller).equal(
                earningForSeller
            );



            // buyer balance should be deducted

            const balanceOfBuyerAfterBuy = await payload.erc20Token1.balanceOf(buyer);
            console.log('balanceOfBuyerBeforeSale', balanceOfBuyerBeforeSale);
            console.log('balanceOfBuyerAfterBuy', balanceOfBuyerAfterBuy);
            console.log('price', price);
            expect(balanceOfBuyerAfterBuy).equal(
                balanceOfBuyerBeforeSale.sub(
                    price
                )
            )

            expect((earningForMarketplace).add(earningForSeller)).equal(price);
        })

    });
}