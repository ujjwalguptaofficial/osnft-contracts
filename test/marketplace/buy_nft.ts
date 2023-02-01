import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
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
        const tx = marketplace.buy(
            payload.getSellId(
                payload.getProjectId(payload.projects["jsstore-example"]),
                payload.signer2.address
            ),
            0,
            1000000
        );
        await expect(tx).revertedWith('require_on_sale');
    });

    it('price less than listed', async () => {
        const marketplace = payload.marketplace;
        const tx = marketplace.buy(
            payload.getSellId(
                payload.getProjectId(payload.projects["jsstore-example"]),
                payload.signer3.address
            ),
            0,
            1000000
        );
        await expect(tx).revertedWith('require_price_above_equal_sell_price');
    });

    it('buy without erc20 allowance of buyer', async () => {
        const marketplace = payload.marketplace;
        const sellId = payload.getSellId(
            payload.getProjectId(payload.projects["jsstore-example"]),
            payload.signer3.address
        );
        const price = (await marketplace.getSell(sellId)).price;
        const tx = marketplace.buy(
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
        const price = (await marketplace.getSell(sellId)).price;
        const buyer = payload.signer4.address;

        expect(creatorOf).not.equal(buyer);

        await payload.erc20Token1.connect(payload.signer4).approve(
            marketplace.address, ethers.constants.MaxUint256,
        )
        const gas = await marketplace.connect(payload.signer4).estimateGas.buy(
            sellId,
            0,
            price
        );
        expect(gas).equal(204183);

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
        // expect(creatorOf).equal(ownerOf);
        expect(ownerOf).equal(marketplace.address);
        expect(creatorOf).equal(seller);

        expect(buyer).not.equal(seller);

        const price = (await marketplace.getSell(sellId)).price;

        await payload.erc20Token1.approve(
            marketplace.address, ethers.constants.MaxUint256,
        )

        const gas = await marketplace.estimateGas.buy(
            sellId,
            0,
            price
        );
        expect(gas).equal(170317);

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

            const sellInfo = await marketplace.getSell(sellId);
            const price = sellInfo.price;
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

            const tx = marketplace.connect(payload.signer4).buy(
                sellId,
                0,
                price
            );

            await expect(tx).emit(payload.marketplace, 'Sold').withArgs(
                sellId, price, seller, sellInfo.sellTimestamp
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

        it('isSellActive', async () => {
            const tokenId = payload.getProjectId(
                payload.projects["jsstore-example"]
            );
            const marketplace = payload.marketplace;
            const from = payload.signer3.address;
            const sellId = payload.getSellId(tokenId, from);
            const isSellActive = await marketplace.isSellActive(sellId);

            expect(isSellActive).equal(false);
        })


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
            expect(ownerOf).equal(marketplace.address);
            expect(creatorOf).equal(seller);

            expect(buyer).not.equal(seller);

            const sellInfo = await marketplace.getSell(sellId);
            const price = sellInfo.price;

            await payload.erc20Token1.approve(
                marketplace.address, ethers.constants.MaxUint256,
            )

            const balanceOfSellerBeforeSale = await payload.erc20Token1.balanceOf(seller);
            const balanceOfBuyerBeforeSale = await payload.erc20Token1.balanceOf(buyer);
            const balanceOfMarketPlaceBeforeSale = await payload.erc20Token1.balanceOf(payload.marketplace.address);
            const paymentToken = payload.erc20Token1.address;

            const tx = marketplace.buy(
                sellId,
                0,
                price
            );

            await expect(tx).emit(payload.marketplace, 'Sold').withArgs(
                sellId, price, seller, sellInfo.sellTimestamp
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


        it('isSellActive', async () => {
            const tokenId = payload.getProjectId(
                payload.projects["mahal-example"]
            );
            const marketplace = payload.marketplace;
            const from = payload.signer2.address;
            const sellId = payload.getSellId(tokenId, from);
            const isSellActive = await marketplace.isSellActive(sellId);

            expect(isSellActive).equal(false);
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

        const price = (await marketplace.getSell(sellId)).price;
        const buyer = payload.signer4.address;

        await payload.erc20Token1.approve(
            marketplace.address, ethers.constants.MaxUint256,
        );

        const gas = await marketplace.estimateGas.buy(
            sellId,
            10,
            price.add(10)
        );
        expect(gas).equal(171875);
    })

    it('buy with zero share', async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(payload.projects["jsstore"]);
        const seller = payload.signer3.address;
        const sellId = payload.getSellId(
            tokenId,
            seller
        );

        const price = (await marketplace.getSell(sellId)).price;

        await payload.erc20Token1.approve(
            marketplace.address, ethers.constants.MaxUint256,
        );

        const tx = marketplace.buy(
            sellId,
            0,
            price.add(10)
        );
        await expect(tx).to.revertedWith('require_input_share_above_zero')
    })

    it('buy with share greater than listed', async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(payload.projects["jsstore"]);
        const seller = payload.signer3.address;
        const sellId = payload.getSellId(
            tokenId,
            seller
        );

        const price = (await marketplace.getSell(sellId)).price;

        await payload.erc20Token1.approve(
            marketplace.address, ethers.constants.MaxUint256,
        );

        const tx = marketplace.buy(
            sellId,
            1000,
            price
        );
        await expect(tx).to.revertedWith('require_input_share_less_equal_sell_share')
    })

    it('buy with price less than listed', async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(payload.projects["jsstore"]);
        const seller = payload.signer3.address;
        const sellId = payload.getSellId(
            tokenId,
            seller
        );

        const price = (await marketplace.getSell(sellId)).price;

        await payload.erc20Token1.approve(
            marketplace.address, ethers.constants.MaxUint256,
        );
        const shareToBuy = 10;

        const tx = marketplace.buy(
            sellId,
            shareToBuy,
            price.sub(2)
        );
        await expect(tx).to.revertedWith('require_price_above_equal_sell_price')
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

        const sellInfoBeforeSale = await marketplace.getSell(sellId);
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
        const shareOfMarketplaceBeforeSale = await payload.nft.shareOf(tokenId, marketplace.address);

        // console.log("shareOfBuyerBeforeSale", shareOfBuyerBeforeSale);
        // console.log("shareOfSellerBeforeSale", shareOfSellerBeforeSale);

        const totalPrice = price.mul(shareToBuy);
        const tx = marketplace.buy(
            sellId,
            shareToBuy,
            price,
        );
        await expect(tx).emit(payload.marketplace, 'Sold').withArgs(
            sellId, price, seller,
            sellInfoBeforeSale.sellTimestamp
        );
        await expect(tx).emit(payload.nft, 'Transfer').withArgs(
            marketplace.address, buyer, tokenId
        );


        const sellInfoAfterSale = await marketplace.getSell(sellId);

        expect(sellInfoAfterSale.share).equal(
            sellInfoBeforeSale.share - shareToBuy
        )

        // seller share should be deducted
        const shareOfMarketplaceAfterSale = await payload.nft.shareOf(tokenId, marketplace.address);
        expect(shareOfMarketplaceAfterSale).equal(
            shareOfMarketplaceBeforeSale - shareToBuy
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

    it('isSellActive after partial transfer', async () => {
        const tokenId = payload.getProjectId(payload.projects["jsstore"]);
        const from = payload.signer3.address;
        const marketplace = payload.marketplace;
        const sellId = payload.getSellId(tokenId, from);
        const isSellActive = await marketplace.isSellActive(sellId);

        expect(isSellActive).equal(true);
    })

    describe("meta buy", () => {

        const signMessage = async (user: SignerWithAddress, sellId, shareToBuy, price, deadline) => {

            const dataType = [
                { name: "sellId", type: "bytes32" },
                { name: "share", type: "uint32" },
                { name: "price", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ];

            const domainData = {
                name: "OSNFT_RELAYER",
                version: "1",
                chainId: await user.getChainId(),
                verifyingContract: payload.relayer.address.toLowerCase(),
            };
            const message = {
                sellId,
                share: shareToBuy,
                price,
                deadline
            };


            const signatureResult = await user._signTypedData(domainData, {
                NFTBuyData: dataType,
            }, message);


            return signatureResult;
        }

        it("passing different from than in sign - invalid_signature", async () => {
            const marketplace = payload.marketplace;
            const tokenId = payload.getProjectId(payload.projects["jsstore"]);
            const seller = payload.signer3.address;

            const sellId = payload.getSellId(
                tokenId,
                seller
            );

            const sellInfoBeforeSale = await marketplace.getSell(sellId);

            const price = sellInfoBeforeSale.price;
            const shareToBuy = 10;
            const deadline = (await time.latest()) + 1000;


            const signature = await signMessage(
                payload.deployer,
                sellId,
                shareToBuy,
                price,
                deadline
            );

            const tx = payload.relayer.buy(
                {
                    signature: signature,
                    deadline,
                    to: payload.signer2.address
                },
                sellId,
                shareToBuy,
                price
            );
            await expect(tx).to.revertedWith('invalid_signature');
        });

        it("expired deadline - invalid_signature", async () => {
            const marketplace = payload.marketplace;
            const tokenId = payload.getProjectId(payload.projects["jsstore"]);
            const seller = payload.signer3.address;

            const sellId = payload.getSellId(
                tokenId,
                seller
            );

            const sellInfoBeforeSale = await marketplace.getSell(sellId);

            const price = sellInfoBeforeSale.price;
            const shareToBuy = 10;
            const deadline = (await time.latest()) - 1000;


            const signature = await signMessage(
                payload.deployer,
                sellId,
                shareToBuy,
                price,
                deadline
            );

            const tx = payload.relayer.buy(
                {
                    signature: signature,
                    deadline,
                    to: payload.deployer.address
                },
                sellId,
                shareToBuy,
                price
            );
            await expect(tx).to.revertedWith('Signature expired');
        });

        it("deadline different than signature", async () => {
            const marketplace = payload.marketplace;
            const tokenId = payload.getProjectId(payload.projects["jsstore"]);
            const seller = payload.signer3.address;

            const sellId = payload.getSellId(
                tokenId,
                seller
            );

            const sellInfoBeforeSale = await marketplace.getSell(sellId);

            const price = sellInfoBeforeSale.price;
            const shareToBuy = 10;
            const deadline = (await time.latest()) + 1000;


            const signature = await signMessage(
                payload.deployer,
                sellId,
                shareToBuy,
                price,
                deadline
            );

            const tx = payload.relayer.buy(
                {
                    signature: signature,
                    deadline: deadline + 2000,
                    to: payload.deployer.address
                },
                sellId,
                shareToBuy,
                price
            );
            await expect(tx).to.revertedWith('invalid_signature');
        });

        it("sellid different than signature", async () => {
            const marketplace = payload.marketplace;
            const tokenId = payload.getProjectId(payload.projects["jsstore"]);
            const seller = payload.signer3.address;

            const sellId = payload.getSellId(
                tokenId,
                seller
            );

            const sellInfoBeforeSale = await marketplace.getSell(sellId);

            const price = sellInfoBeforeSale.price;
            const shareToBuy = 10;
            const deadline = (await time.latest()) + 1000;


            const signature = await signMessage(
                payload.deployer,
                sellId,
                shareToBuy,
                price,
                deadline
            );

            const tx = payload.relayer.buy(
                {
                    signature: signature,
                    deadline: deadline,
                    to: payload.deployer.address
                },
                payload.getSellId(
                    tokenId,
                    payload.approver.address
                ),
                shareToBuy,
                price
            );
            await expect(tx).to.revertedWith('invalid_signature');
        });

        it("share different than signature", async () => {
            const marketplace = payload.marketplace;
            const tokenId = payload.getProjectId(payload.projects["jsstore"]);
            const seller = payload.signer3.address;

            const sellId = payload.getSellId(
                tokenId,
                seller
            );

            const sellInfoBeforeSale = await marketplace.getSell(sellId);

            const price = sellInfoBeforeSale.price;
            const shareToBuy = 10;
            const deadline = (await time.latest()) + 1000;


            const signature = await signMessage(
                payload.deployer,
                sellId,
                shareToBuy,
                price,
                deadline
            );

            const tx = payload.relayer.buy(
                {
                    signature: signature,
                    deadline: deadline,
                    to: payload.deployer.address
                },
                sellId,
                1,
                price
            );
            await expect(tx).to.revertedWith('invalid_signature');
        });

        it("price different than signature", async () => {
            const marketplace = payload.marketplace;
            const tokenId = payload.getProjectId(payload.projects["jsstore"]);
            const seller = payload.signer3.address;

            const sellId = payload.getSellId(
                tokenId,
                seller
            );

            const sellInfoBeforeSale = await marketplace.getSell(sellId);

            const price = sellInfoBeforeSale.price;
            const shareToBuy = 10;
            const deadline = (await time.latest()) + 1000;


            const signature = await signMessage(
                payload.deployer,
                sellId,
                shareToBuy,
                price,
                deadline
            );

            const tx = payload.relayer.buy(
                {
                    signature: signature,
                    deadline: deadline,
                    to: payload.deployer.address
                },
                sellId,
                shareToBuy,
                price.add(2)
            );
            await expect(tx).to.revertedWith('invalid_signature');
        });

        it("Invalid relayer", async () => {
            const marketplace = payload.marketplace;
            const tokenId = payload.getProjectId(payload.projects["jsstore"]);
            const seller = payload.signer3.address;

            const sellId = payload.getSellId(
                tokenId,
                seller
            );

            const sellInfoBeforeSale = await marketplace.getSell(sellId);

            const price = sellInfoBeforeSale.price;
            const shareToBuy = 10;
            const deadline = (await time.latest()) + 1000;


            const signature = await signMessage(
                payload.deployer,
                sellId,
                shareToBuy,
                price,
                deadline
            );

            const tx = payload.marketplace.buyMeta(
                payload.deployer.address,
                sellId,
                shareToBuy,
                price
            );
            await expect(tx).to.revertedWith('invalid_relayer');
        });

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

            const sellInfoBeforeSale = await marketplace.getSell(sellId);

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
            const shareOfMarketplaceBeforeSale = await payload.nft.shareOf(tokenId, marketplace.address);
            expect(shareOfMarketplaceBeforeSale).equal(shareToBuy);
            const totalPrice = price.mul(shareToBuy);

            const deadline = (await time.latest()) + 1000;


            const signature = await signMessage(
                payload.deployer,
                sellId,
                shareToBuy,
                price,
                deadline
            );

            const tx = payload.relayer.buy(
                {
                    signature: signature,
                    deadline,
                    to: payload.deployer.address
                },
                sellId,
                shareToBuy,
                price
            );
            await expect(tx).emit(payload.marketplace, 'Sold').withArgs(
                sellId, price, seller, sellInfoBeforeSale.sellTimestamp
            );
            await expect(tx).emit(payload.nft, 'Transfer').withArgs(
                marketplace.address, buyer, tokenId
            );
            await expect(tx).emit(payload.nft, 'TransferShare').withArgs(
                shareToBuy
            );


            const sellInfoAfterSale = await marketplace.getSell(sellId);
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
            const shareOfSellerAfterSale = await payload.nft.shareOf(tokenId, marketplace.address);
            expect(shareOfSellerAfterSale).equal(
                shareOfMarketplaceBeforeSale - shareToBuy
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

        it('isSellActive', async () => {
            const tokenId = payload.getProjectId(payload.projects["jsstore"]);
            const from = payload.signer3.address;
            const marketplace = payload.marketplace;
            const sellId = payload.getSellId(tokenId, from);
            const isSellActive = await marketplace.isSellActive(sellId);

            expect(isSellActive).equal(false);
        })

    })

    it('isSellActive', async () => {
        const tokenId = payload.getProjectId(payload.projects["mahal-webpack-loader"]);
        const from = payload.signer3.address;
        const marketplace = payload.marketplace;
        const sellId = payload.getSellId(tokenId, from);
        const isSellActive = await marketplace.isSellActive(sellId);

        expect(isSellActive).equal(true);
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
        expect(ownerOf).equal(marketplace.address);
        expect(creatorOf).equal(seller);

        expect(buyer).not.equal(seller);

        const price = ethers.constants.MaxUint256; //(await marketplace.getSell(sellId)).price;

        await erc20Token.connect(payload.signer2).approve(marketplace.address, ethers.constants.MaxUint256);

        const balanceOfSellerBeforeSale = await erc20Token.balanceOf(seller);
        const balanceOfBuyerBeforeSale = await erc20Token.balanceOf(buyer);
        const balanceOfMarketPlaceBeforeSale = await erc20Token.balanceOf(payload.marketplace.address);
        const paymentToken = erc20Token.address;
        const balanceOfCreatorBeforeSale = await payload.erc20Token1.balanceOf(creatorOf);
        const sellInfo = await marketplace.getSell(sellId);
        const tx = marketplace.connect(payload.signer2).buy(
            sellId,
            0,
            price
        );
        await expect(tx).emit(payload.marketplace, 'Sold').withArgs(
            sellId, price, seller, sellInfo.sellTimestamp
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

        payload.transactions['buyMahalWebpackLoader'].push(
            (await tx).hash
        )

    });

    it('isSellActive', async () => {
        const tokenId = payload.getProjectId(payload.projects["mahal-webpack-loader"]);
        const from = payload.signer3.address;
        const marketplace = payload.marketplace;
        const sellId = payload.getSellId(tokenId, from);
        const isSellActive = await marketplace.isSellActive(sellId);

        expect(isSellActive).equal(false);

    })

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

        await marketplace.connect(payload.signer2).sell({
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

        const sellInfo = await marketplace.getSell(sellId)

        await erc20Token.connect(payload.signer4).approve(marketplace.address, ethers.constants.MaxUint256);

        const balanceOfSellerBeforeSale = await erc20Token.balanceOf(seller);
        const balanceOfBuyerBeforeSale = await erc20Token.balanceOf(buyer);
        const balanceOfMarketPlaceBeforeSale = await erc20Token.balanceOf(payload.marketplace.address);
        const paymentToken = erc20Token.address;

        const tx = marketplace.connect(payload.signer4).buy(
            sellId,
            0,
            price,
        );

        await expect(tx).emit(payload.marketplace, 'Sold').withArgs(
            sellId, price, seller,
            sellInfo.sellTimestamp
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

    it('isSellActive', async () => {
        const tokenId = payload.getProjectId(payload.projects["mahal-webpack-loader"]);
        const from = payload.signer2.address;
        const marketplace = payload.marketplace;
        const sellId = payload.getSellId(tokenId, from);
        const isSellActive = await marketplace.isSellActive(sellId);

        expect(isSellActive).equal(false);


    })
}