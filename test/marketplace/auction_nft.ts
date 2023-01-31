import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { IDeployedPayload } from "../interfaces";

function addHours(date: Date, h: number) {
    date.setTime(date.getTime() + (h * 60 * 60 * 1000));
    return date;
}



export function testNFTAuction(payload: IDeployedPayload) {

    const signMessage = async (user: SignerWithAddress, tokenId, share, initialBid, endAuction, erc20token, sellPriority, deadline) => {
        const domainType = [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
        ];
        const nftMintDataType = [
            { name: "tokenId", type: "bytes32" },
            { name: "share", type: "uint32" },
            { name: "initialBid", type: "uint256" },
            { name: "endAuction", type: "uint256" },
            { name: "paymentToken", type: "address" },
            { name: "sellPriority", type: "uint32" },
            { name: "deadline", type: "uint256" },
        ];

        const domainData = {
            name: "OSNFT_RELAYER",
            version: "1",
            chainId: await user.getChainId(),
            verifyingContract: payload.relayer.address.toLowerCase(),
        };
        const message = {
            tokenId,
            share,
            initialBid: initialBid,
            endAuction,
            paymentToken: erc20token,
            sellPriority,
            deadline
        };

        const signatureResult = await user._signTypedData(domainData, {
            NFTAuctionData: nftMintDataType,
        }, message);

        return signatureResult;
    }

    it('auction with timestamp less than block', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const owner = await payload.nft.ownerOf(projectId);
        console.log('owner', owner === payload.signer4.address);

        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        const timestampBefore = blockBefore.timestamp;

        const tx = marketplace.connect(payload.signer4).createAuction(
            {
                tokenId: projectId,
                share: 0,
                initialBid: 1234,
                endAuction: timestampBefore,
                paymentToken: payload.erc20Token1.address,
                sellPriority: 0
            }
        );
        await expect(tx).revertedWith('invalid_end_auction');
    });

    it('auction with zero price', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );

        const tx = marketplace.connect(payload.signer4).createAuction(
            {
                tokenId: projectId,
                share: 0,
                initialBid: 0,
                endAuction: new Date().getTime(),
                paymentToken: payload.erc20Token1.address,
                sellPriority: 0
            }
        );
        await expect(tx).revertedWith('require_bidprice_above_zero');
    });

    it('should be nft owner', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );

        const tx = marketplace.createAuction(
            {
                tokenId: projectId,
                share: 0,
                initialBid: 10,
                endAuction: new Date().getTime(),
                paymentToken: payload.erc20Token1.address,
                sellPriority: 0
            }
        );
        await expect(tx).revertedWith('ERC721: transfer from incorrect owner');
    });

    // it('require approval', async () => {

    //     // change default marketplace to default

    //     const defaultMarketPlace = payload.operator.address;
    //     await payload.nft["defaultMarketPlace(address)"](defaultMarketPlace);


    //     const marketplace = payload.marketplace;
    //     const projectId = payload.getProjectId(
    //         payload.projects["jsstore-example"]
    //     );

    //     const tx = marketplace.connect(payload.signer4).createAuction(
    //         {
    //             tokenId: projectId,
    //             share: 0,
    //             initialBid: 10,
    //             endAuction: new Date().getTime(),
    //             paymentToken: payload.erc20Token1.address,
    //             sellPriority: 0
    //         }
    //     );
    //     await expect(tx).revertedWith('require_nft_transfer_approval');

    // });

    it('change default marketplace', async () => {
        const defaultMarketPlace = payload.marketplace.address;
        const tx = await payload.nft["defaultMarketPlace(address)"](defaultMarketPlace);

        const defaultMarketPlaceValue = await payload.nft["defaultMarketPlace()"]();

        expect(defaultMarketPlaceValue).equal(defaultMarketPlace);
    });

    it('require not listed for sale', async () => {

        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );

        const tx1 = await marketplace.connect(payload.signer4).sell(
            {
                tokenId: projectId,
                share: 0,
                price: 10,
                paymentToken: payload.erc20Token1.address,
                sellPriority: 0
            }
        );
        const tx2 = marketplace.connect(payload.signer4).createAuction(
            {
                tokenId: projectId,
                share: 0,
                initialBid: 10,
                endAuction: new Date().getTime(),
                paymentToken: payload.erc20Token1.address,
                sellPriority: 0
            }
        );
        await expect(tx2).revertedWith('already_on_sale');
    });

    it('removeSell for jsstore example', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const seller = payload.signer4.address;
        const sellId = payload.getSellId(projectId, seller);

        const auction = await marketplace.getSell(sellId);

        const nativeCoin = payload.nativeToken;

        const nativeCoinBalance = await nativeCoin.balanceOf(seller);

        const tx = marketplace.connect(payload.signer4).removeSell(
            sellId
        )

        await expect(tx).emit(marketplace, "SellCancel").withArgs(
            sellId, projectId, seller, auction.sellTimestamp
        )
        await expect(tx).emit(payload.nft, "Transfer").withArgs(
            marketplace.address, seller, projectId
        );

        const owner = await payload.nft.ownerOf(projectId);

        expect(owner).equal(seller);


        const nativeCoinBalanceAfter = await nativeCoin.balanceOf(seller);
        const expectedDeduction = ethers.utils.parseEther("0.01");
        expect(nativeCoinBalanceAfter).equal(
            nativeCoinBalance.sub(expectedDeduction)
        )

    });

    it('require payable token', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );

        const tx = marketplace.connect(payload.signer4).createAuction({
            tokenId: projectId,
            share: 0,
            initialBid: 10,
            endAuction: new Date().getTime(),
            paymentToken: payload.deployer.address,
            sellPriority: 0
        });
        await expect(tx).revertedWith('invalid_payment_token');
    });

    it('not existing token', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            "ffgg"
        );

        const tx = marketplace.createAuction(
            {
                tokenId: projectId,
                share: 0,
                initialBid: 10,
                endAuction: new Date().getTime(),
                paymentToken: payload.erc20Token1.address,
                sellPriority: 0
            });
        await expect(tx).revertedWith('ERC721: invalid token ID');
    });



    it('estimate gas for successful auction', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );

        const endAuction = new Date().getTime(); //+ 1000; //addHours(, 24).getTime();
        const gas = await marketplace.connect(payload.signer4).estimateGas.createAuction(
            {
                tokenId: projectId,
                share: 0,
                initialBid: 1000,
                endAuction,
                paymentToken: payload.erc20Token1.address,
                sellPriority: 0
            });
        expect(gas).within(238689, 238699)
    })

    it('successful auction for jsstore example', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const seller = payload.signer4.address;


        const endAuction = (await time.latest()) + 100; // Math.floor(Date.now() / 1000) + 10000;
        //        (await time.latest()) + 100000000; // new Date().getTime(); //+ 1000; //addHours(, 24).getTime();
        console.log('endAuction', endAuction);
        const sellPriority = 100;
        const nativeCoin = payload.nativeToken;
        const from = seller;
        const nativeCoinBalance = await nativeCoin.balanceOf(from);

        const initialBid = 1000;

        const tx = marketplace.connect(payload.signer4).createAuction({
            tokenId: projectId,
            share: 0,
            initialBid: initialBid,
            endAuction,
            paymentToken: payload.erc20Token1.address,
            sellPriority: sellPriority
        });
        const auctionId = payload.getSellId(projectId, seller);
        await expect(tx).emit(marketplace, 'Auction').withArgs(
            auctionId,
            initialBid,
            endAuction,
            payload.erc20Token1.address,
            sellPriority
        )
        await expect(tx).emit(payload.nft, 'Transfer').withArgs(
            seller,
            marketplace.address,
            projectId,
        );

        const newOwner = await payload.nft.ownerOf(projectId);
        expect(newOwner).equal(marketplace.address);

        const bidOwner = await marketplace.getBidOwner(auctionId);
        expect(bidOwner).equal(ethers.constants.AddressZero);


        const bidPrice = await marketplace.getBidPrice(auctionId);
        expect(bidPrice).equal(1000);

        const nativeCoinBalanceAfter = await nativeCoin.balanceOf(from);
        const expectedDeduction = BigNumber.from(10).pow(15).mul(sellPriority);
        expect(nativeCoinBalanceAfter).equal(
            nativeCoinBalance.sub(expectedDeduction)
        )

        // check auction



        const auction = await marketplace.getAuction(auctionId);

        const expectedAuction = {
            tokenId: projectId,
            share: 0,
            seller: from,
            paymentToken: payload.erc20Token1.address, // Address of the ERC20 Payment Token contract
            currentBidOwner: ethers.constants.AddressZero, // Address of the highest bider
            currentBidPrice: initialBid, // Current highest bid for the auction
            endAuction: endAuction, // Timestamp for the end day&time of the auction
            sellPriority: 100
        };
        for (const prop in expectedAuction) {
            expect((expectedAuction as any)[prop]).equal((auction as any)[prop]);
        }


        payload.transactions['sellJsStoreExamples'].push(
            {
                txHash: (await tx).hash,
                expires: endAuction
            }
        );
    });



    it('isSellActive', async () => {
        const tokenId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const marketplace = payload.marketplace;
        const from = payload.signer4.address;
        const sellId = payload.getSellId(tokenId, from);
        const isSellActive = await marketplace.isSellActive(sellId);

        expect(isSellActive).equal(true);

    })

    it('placing on sale after successful auction', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const seller = payload.signer4.address;


        const endAuction = (await time.latest()) + 100; // Math.floor(Date.now() / 1000) + 10000;
        //        (await time.latest()) + 100000000; // new Date().getTime(); //+ 1000; //addHours(, 24).getTime();
        console.log('endAuction', endAuction);
        const sellPriority = 100;
        const nativeCoin = payload.nativeToken;
        const from = seller;
        const nativeCoinBalance = await nativeCoin.balanceOf(from);

        const tx = marketplace.connect(payload.signer4).sell({
            tokenId: projectId,
            share: 0,
            price: 1000,
            paymentToken: payload.erc20Token1.address,
            sellPriority: sellPriority
        });
        await expect(tx).revertedWith('ERC721: transfer from incorrect owner');
    });

    it('require share greater than zero', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore"]
        );

        const tx = marketplace.createAuction({
            tokenId: projectId,
            share: 0,
            initialBid: 1000,
            endAuction: new Date().getTime(),
            paymentToken: payload.erc20Token1.address,
            sellPriority: 0
        });
        await expect(tx).revertedWith('require_input_share_above_zero');
    });

    it('Placing share by not owner', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore"]
        );

        const tx = marketplace.connect(payload.signer4).createAuction({
            tokenId: projectId,
            share: 1,
            initialBid: 1000,
            endAuction: new Date().getTime(),
            paymentToken: payload.erc20Token1.address,
            sellPriority: 0
        });
        await expect(tx).revertedWith('require_input_share_less_equal_owner_share');
    });

    it('Placing share greater than own', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore"]
        );

        const tx = marketplace.createAuction({
            tokenId: projectId,
            share: 10000,
            initialBid: 1000,
            endAuction: new Date().getTime(),
            paymentToken: payload.erc20Token1.address,
            sellPriority: 0
        });
        await expect(tx).revertedWith('require_input_share_less_equal_owner_share');
    });

    it('estimate gas for successful share auction', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore"]
        );
        const endAuction = addHours(new Date(), 24).getTime();

        const gas = await marketplace.estimateGas.createAuction({
            tokenId: projectId,
            share: 100,
            initialBid: 10000,
            endAuction,
            paymentToken: payload.erc20Token1.address,
            sellPriority: 0
        });
        expect(gas).within(244943, 244953)
    })

    describe('createAuctionMeta', () => {

        it('sending expired signature', async () => {
            const marketplace = payload.marketplace;
            const relayer = payload.relayer;
            const projectId = payload.getProjectId(
                payload.projects["jsstore"]
            );
            const seller = payload.deployer.address;
            const from = seller;

            const endAuction = (await time.latest()) + 200;
            const shareToAuction = 100;
            const deadline = (await time.latest()) - 1000;

            const signature = await signMessage(
                payload.deployer,
                projectId,
                shareToAuction,
                10000,
                endAuction,
                payload.erc20Token1.address,
                0,
                deadline
            );

            const tx = relayer.createAuction({
                signature: signature,
                to: from,
                deadline: deadline
            }, {
                tokenId: projectId,
                share: shareToAuction,
                initialBid: 10000,
                endAuction,
                paymentToken: payload.erc20Token1.address,
                sellPriority: 0
            });

            await expect(tx).to.revertedWith(`Signature expired`);
        });

        it('sending expired signature with different deadline', async () => {
            const marketplace = payload.marketplace;
            const relayer = payload.relayer;
            const projectId = payload.getProjectId(
                payload.projects["jsstore"]
            );
            const seller = payload.deployer.address;
            const from = seller;

            const endAuction = (await time.latest()) + 200;
            const shareToAuction = 100;
            const deadline = (await time.latest()) - 1000;

            const signature = await signMessage(
                payload.deployer,
                projectId,
                shareToAuction,
                10000,
                endAuction,
                payload.erc20Token1.address,
                0,
                deadline
            );

            const tx = relayer.createAuction({
                signature: signature,
                to: from,
                deadline: deadline + 2000
            }, {
                tokenId: projectId,
                share: shareToAuction,
                initialBid: 10000,
                endAuction,
                paymentToken: payload.erc20Token1.address,
                sellPriority: 0
            });

            await expect(tx).to.revertedWith(`invalid_signature`);
        });

        it('sending signature with different sell Priority', async () => {
            const marketplace = payload.marketplace;
            const relayer = payload.relayer;
            const projectId = payload.getProjectId(
                payload.projects["jsstore"]
            );
            const seller = payload.deployer.address;
            const from = seller;

            const endAuction = (await time.latest()) + 200;
            const shareToAuction = 100;
            const deadline = (await time.latest()) + 1000;

            const signature = await signMessage(
                payload.deployer,
                projectId,
                shareToAuction,
                10000,
                endAuction,
                payload.erc20Token1.address,
                0,
                deadline
            );

            const tx = relayer.createAuction({
                signature: signature,
                to: from,
                deadline: deadline
            }, {
                tokenId: projectId,
                share: shareToAuction,
                initialBid: 10000,
                endAuction,
                paymentToken: payload.erc20Token1.address,
                sellPriority: 100
            });

            await expect(tx).to.revertedWith(`invalid_signature`);
        });

        it('Invalid relayer', async () => {
            const marketplace = payload.marketplace;
            const projectId = payload.getProjectId(
                payload.projects["jsstore"]
            );
            const seller = payload.deployer.address;
            // const endAuction = addHours(new Date(), 24).getTime();

            const nativeCoin = payload.nativeToken;
            const from = seller;
            const nativeCoinBalance = await nativeCoin.balanceOf(from);


            const endAuction = (await time.latest()) + 200;
            const shareToAuction = 100;
            const deadline = (await time.latest()) + 1000;

            const signature = await signMessage(
                payload.deployer,
                projectId,
                shareToAuction,
                10000,
                endAuction,
                payload.erc20Token1.address,
                0,
                deadline
            );

            const tx = payload.marketplace.connect(payload.signer2).createAuctionMeta(from, {
                tokenId: projectId,
                share: shareToAuction,
                initialBid: 10000,
                endAuction,
                paymentToken: payload.erc20Token1.address,
                sellPriority: 0
            });
            await expect(tx).revertedWith(`invalid_relayer`)


        });

        it('successful share auction', async () => {
            const marketplace = payload.marketplace;
            const relayer = payload.relayer;
            const projectId = payload.getProjectId(
                payload.projects["jsstore"]
            );
            const seller = payload.deployer.address;
            // const endAuction = addHours(new Date(), 24).getTime();

            const nativeCoin = payload.nativeToken;
            const from = seller;
            const nativeCoinBalance = await nativeCoin.balanceOf(from);


            const endAuction = (await time.latest()) + 200;
            const shareToAuction = 100;
            const deadline = (await time.latest()) + 1000;

            const sellPriority = 1;

            const initialBid = 10000;


            const signature = await signMessage(
                payload.deployer,
                projectId,
                shareToAuction,
                initialBid,
                endAuction,
                payload.erc20Token1.address,
                sellPriority,
                deadline
            );

            const tx = relayer.connect(payload.signer2).createAuction({
                signature: signature,
                to: from,
                deadline: deadline
            }, {
                tokenId: projectId,
                share: shareToAuction,
                initialBid: initialBid,
                endAuction,
                paymentToken: payload.erc20Token1.address,
                sellPriority: sellPriority
            });
            const totalPrice = initialBid * shareToAuction;
            const auctionId = payload.getSellId(projectId, seller);
            await expect(tx).emit(marketplace, 'Auction').withArgs(
                auctionId,
                initialBid,
                endAuction,
                payload.erc20Token1.address,
                sellPriority
            )

            await expect(tx).emit(payload.nft, 'Transfer').withArgs(
                seller,
                marketplace.address,
                projectId,
            );
            await expect(tx).emit(payload.nft, 'TransferShare').withArgs(
                shareToAuction
            );
            // await expect(tx).emit(payload.erc20Token1, 'Transfer').withArgs(
            //     seller,
            //     marketplace.address,
            //     totalPrice,
            // );

            const shareOfMarketPlace = await payload.nft.shareOf(projectId, marketplace.address);
            expect(shareOfMarketPlace).equal(shareToAuction);

            const bidOwner = await marketplace.getBidOwner(auctionId);
            expect(bidOwner).equal(ethers.constants.AddressZero);


            const bidPrice = await marketplace.getBidPrice(auctionId);
            expect(bidPrice).equal(totalPrice);

            const nativeCoinBalanceAfter = await nativeCoin.balanceOf(from);
            const expectedDeduction = BigNumber.from(10).pow(15).mul(sellPriority);
            expect(nativeCoinBalanceAfter).equal(
                nativeCoinBalance.sub(expectedDeduction)
            )

            const auction = await marketplace.getAuction(auctionId);

            const expectedAuction = {
                tokenId: projectId,
                share: shareToAuction,
                seller: from,
                paymentToken: payload.erc20Token1.address, // Address of the ERC20 Payment Token contract
                currentBidOwner: ethers.constants.AddressZero, // Address of the highest bider
                currentBidPrice: initialBid * shareToAuction, // Current highest bid for the auction
                endAuction: endAuction, // Timestamp for the end day&time of the auction
                // bidCount: 0 //
            };
            for (const prop in expectedAuction) {
                expect((expectedAuction as any)[prop]).equal((auction as any)[prop]);
            }

            payload.transactions.sellJsStore.push(
                {
                    txHash: (await tx).hash,
                    expires: endAuction
                }
            )
        });

        it('isSellActive', async () => {
            const tokenId = payload.getProjectId(
                payload.projects["jsstore"]
            );
            const marketplace = payload.marketplace;
            const from = payload.deployer.address;
            const sellId = payload.getSellId(tokenId, from);
            const isSellActive = await marketplace.isSellActive(sellId);

            expect(isSellActive).equal(true);
        })
    })
}