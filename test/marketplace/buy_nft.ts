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

    it('seller is not creator gas estimate', async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(payload.projects["jsstore-example"]);
        const seller = payload.signer3.address;
        const sellId = payload.getSellId(
            tokenId,
            seller
        );
        const creatorOf = await payload.nft.creatorOf(tokenId);
        expect(creatorOf).not.equal(seller);
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
        expect(gas).equal(218719);

    });

    it('seller is creator gas estimate', async () => {
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
        expect(gas).equal(184790);

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
            );

            const paymentToken = payload.erc20Token1.address;
            const balanceOfBuyerBeforeSale = await payload.erc20Token1.balanceOf(buyer);
            const balanceOfMarketPlaceBeforeSale = await payload.erc20Token1.balanceOf(payload.marketplace.address);
            const balanceOfSellerBeforeSale = await payload.erc20Token1.balanceOf(seller);
            const balanceOfCreatorBeforeSale = await payload.erc20Token1.balanceOf(creatorOf);

            const tx = marketplace.connect(payload.signer4).buyNFT(
                sellId,
                0,
                price
            );

            await expect(tx).emit(payload.marketplace, 'Sold').withArgs(
                sellId, price
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

            payload.transactions['buyJsStoreExample'].push(
                (await tx).hash
            )
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

            const balanceOfSellerBeforeSale = await payload.erc20Token1.balanceOf(seller);
            const balanceOfBuyerBeforeSale = await payload.erc20Token1.balanceOf(buyer);
            const balanceOfMarketPlaceBeforeSale = await payload.erc20Token1.balanceOf(payload.marketplace.address);
            const paymentToken = payload.erc20Token1.address;

            const tx = marketplace.buyNFT(
                sellId,
                0,
                price
            );

            await expect(tx).emit(payload.marketplace, 'Sold').withArgs(
                sellId, price
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

            payload.transactions['buyMahalExample'].push(
                (await tx).hash
            )
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
        expect(gas).equal(195004);
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

    it('partial buy share nft - jsstore', async () => {
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

        console.log("balanceOfBuyerBeforeSale", balanceOfBuyerBeforeSale);


        const paymentToken = payload.erc20Token1.address;
        const shareToBuy = 10;
        const shareOfBuyerBeforeSale = await payload.nft.shareOf(tokenId, buyer);
        const shareOfSellerBeforeSale = await payload.nft.shareOf(tokenId, seller);

        // console.log("shareOfBuyerBeforeSale", shareOfBuyerBeforeSale);
        // console.log("shareOfSellerBeforeSale", shareOfSellerBeforeSale);

        const totalPrice = price.mul(shareToBuy);
        const tx = marketplace.buyNFT(
            sellId,
            shareToBuy,
            price
        );
        await expect(tx).emit(payload.marketplace, 'Sold').withArgs(
            sellId, totalPrice
        );
        await expect(tx).emit(payload.nft, 'Transfer').withArgs(
            seller, buyer, tokenId
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
        const earningForMarketplace = getPercentage(totalPrice, 2);
        const earningForSeller = totalPrice.sub(earningForMarketplace); //getPercentage(price, 98);

        // check marketplace money

        const balanceOfMarketPlace = await payload.erc20Token1.balanceOf(payload.marketplace.address);
        // console.log('balanceOfMarketPlace', balanceOfMarketPlace);
        // console.log('earningForMarketplace', earningForMarketplace);
        // console.log('balanceOfMarketPlaceBeforeSale', balanceOfMarketPlaceBeforeSale);
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

        payload.transactions['buyJsStore'].push(
            (await tx).hash
        )
    })

    it('all buy share nft - jsstore', async () => {
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
        const balanceOfSellerBeforeSale = await payload.erc20Token1.balanceOf(seller);
        const balanceOfMarketPlaceBeforeSale = await payload.erc20Token1.balanceOf(marketplace.address);
        const paymentToken = payload.erc20Token1.address;
        const shareToBuy = sellInfoBeforeSale.share;
        expect(shareToBuy).equal(90);
        console.log("balanceOfBuyerBeforeSale", balanceOfBuyerBeforeSale);
        const shareOfBuyerBeforeSale = await payload.nft.shareOf(tokenId, buyer);
        const shareOfSellerBeforeSale = await payload.nft.shareOf(tokenId, seller);
        const totalPrice = price.mul(shareToBuy);
        const tx = marketplace.buyNFT(
            sellId,
            shareToBuy,
            price
        );
        await expect(tx).emit(payload.marketplace, 'Sold').withArgs(
            sellId, totalPrice
        );
        await expect(tx).emit(payload.nft, 'Transfer').withArgs(
            seller, buyer, tokenId
        );


        const sellInfoAfterSale = await marketplace.getNFTFromSale(sellId);
        const expectedVal = {
            price: 0,
            seller: ethers.constants.AddressZero,
            share: 0,
            paymentToken: ethers.constants.AddressZero,
            tokenId: '0x0000000000000000000000000000000000000000000000000000000000000000',
            sellPriority: 0
        };
        for (const prop in expectedVal) {
            expect((sellInfoAfterSale as any)[prop]).equal((expectedVal as any)[prop]);
        }

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

        expect(balanceOfSeller.sub(balanceOfSellerBeforeSale)).equal(
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

        payload.transactions['buyJsStore'].push(
            (await tx).hash
        )
    })

    it('buy mahal webpack loader - 0 % percentage cut, price - max uint value, selled by creator', async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(payload.projects["mahal-webpack-loader"]);
        const seller = payload.signer3.address;
        const buyer = payload.signer2.address;

        const erc20Token = payload.erc20Token2;


        const sellId = payload.getSellId(
            tokenId,
            seller
        );
        const creatorOf = await payload.nft.creatorOf(tokenId);
        const ownerOf = await payload.nft.ownerOf(tokenId);
        expect(creatorOf).equal(ownerOf);
        expect(creatorOf).equal(seller);

        expect(buyer).not.equal(seller);

        const price = ethers.constants.MaxUint256; //(await marketplace.getNFTFromSale(sellId)).price;

        await erc20Token.connect(payload.signer2).approve(marketplace.address, ethers.constants.MaxUint256);

        const balanceOfSellerBeforeSale = await erc20Token.balanceOf(seller);
        const balanceOfBuyerBeforeSale = await erc20Token.balanceOf(buyer);
        const balanceOfMarketPlaceBeforeSale = await erc20Token.balanceOf(payload.marketplace.address);
        const paymentToken = erc20Token.address;
        const balanceOfCreatorBeforeSale = await payload.erc20Token1.balanceOf(creatorOf);
        const tx = marketplace.connect(payload.signer2).buyNFT(
            sellId,
            0,
            price
        );
        await expect(tx).emit(payload.marketplace, 'Sold').withArgs(
            sellId, price
        );

        // check nft owner

        const newOwner = await payload.nft.ownerOf(tokenId);
        expect(newOwner).equal(buyer);

        // check marketplace money

        const earningForMarketplace = getPercentage(price, 2);
        const earningForSeller = price.sub(earningForMarketplace); //getPercentage(price, 98);

        // check marketplace money

        const balanceOfMarketPlace = await erc20Token.balanceOf(payload.marketplace.address);
        expect(balanceOfMarketPlace).equal(
            earningForMarketplace.add(balanceOfMarketPlaceBeforeSale)
        );

        const balanceOfSeller = await erc20Token.balanceOf(seller);



        expect(balanceOfSeller).equal(
            earningForSeller.add(balanceOfSellerBeforeSale)
        );



        // buyer balance should be deducted

        const balanceOfBuyerAfterBuy = await erc20Token.balanceOf(buyer);

        expect(balanceOfBuyerAfterBuy).equal(
            balanceOfBuyerBeforeSale.sub(
                price
            )
        )

        const balanceOfCreatorAfterSale = await payload.erc20Token1.balanceOf(creatorOf);

        expect(balanceOfCreatorAfterSale).equal(
            balanceOfCreatorBeforeSale
        );


        expect((earningForMarketplace).add(earningForSeller)).equal(price);
    });

    it('buy mahal webpack loader - 0 % percentage cut, price - max uint value, selled by not creator', async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(payload.projects["mahal-webpack-loader"]);
        const seller = payload.signer2.address;
        const buyer = payload.signer4.address;

        const erc20Token = payload.erc20Token2;

        const price = ethers.constants.MaxUint256;

        // const balanceOfSeller = 

        // transfer amount to buyer so that he can buy
        const balanceOfMarketPlaceForToken2 = await erc20Token.balanceOf(marketplace.address);
        await marketplace.withdrawEarningTo(buyer, erc20Token.address, balanceOfMarketPlaceForToken2);
        // await erc20Token.connect(marketplace).transfer(balanceOfMarketPlaceForToken2,)
        await erc20Token.connect(payload.signer3).transfer(buyer, price.sub(balanceOfMarketPlaceForToken2));


        // add on sale

        await marketplace.connect(payload.signer2).listNFTOnSale({
            tokenId, share: 0, price, paymentToken: erc20Token.address, sellPriority: 0
        });

        const sellId = payload.getSellId(
            tokenId,
            seller
        );
        const creatorOf = await payload.nft.creatorOf(tokenId);
        const ownerOf = await payload.nft.ownerOf(tokenId);
        expect(creatorOf).not.equal(ownerOf);

        expect(buyer).not.equal(seller);

        //(await marketplace.getNFTFromSale(sellId)).price;

        await erc20Token.connect(payload.signer4).approve(marketplace.address, ethers.constants.MaxUint256);

        const balanceOfSellerBeforeSale = await erc20Token.balanceOf(seller);
        const balanceOfBuyerBeforeSale = await erc20Token.balanceOf(buyer);
        const balanceOfMarketPlaceBeforeSale = await erc20Token.balanceOf(payload.marketplace.address);
        const paymentToken = erc20Token.address;

        const tx = marketplace.connect(payload.signer4).buyNFT(
            sellId,
            0,
            price
        );

        await expect(tx).emit(payload.marketplace, 'Sold').withArgs(
            sellId, price
        );

        // check nft owner

        const newOwner = await payload.nft.ownerOf(tokenId);
        expect(newOwner).equal(buyer);

        // check marketplace money

        const earningForMarketplace = getPercentage(price, 2);
        const earningForSeller = price.sub(earningForMarketplace); //getPercentage(price, 98);

        // check marketplace money

        const balanceOfMarketPlace = await erc20Token.balanceOf(payload.marketplace.address);
        expect(balanceOfMarketPlace).equal(
            earningForMarketplace.add(balanceOfMarketPlaceBeforeSale)
        );

        const balanceOfSellerAfterSale = await erc20Token.balanceOf(seller);



        expect(balanceOfSellerAfterSale).equal(
            earningForSeller.add(balanceOfSellerBeforeSale)
        );



        // buyer balance should be deducted

        const balanceOfBuyerAfterBuy = await erc20Token.balanceOf(buyer);

        expect(balanceOfBuyerAfterBuy).equal(
            balanceOfBuyerBeforeSale.sub(
                price
            )
        )

        expect((earningForMarketplace).add(earningForSeller)).equal(price);
    });

}