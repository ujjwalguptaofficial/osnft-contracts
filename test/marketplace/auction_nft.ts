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
            name: "OSNFT_MARKETPLACE",
            version: "1",
            chainId: await user.getChainId(),
            verifyingContract: payload.marketplace.address.toLowerCase(),
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
                paymentTokenAddress: payload.erc20Token1.address,
                sellPriority: 0
            }
        );
        await expect(tx).revertedWith('Invalid end date for auction');
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
                paymentTokenAddress: payload.erc20Token1.address,
                sellPriority: 0
            }
        );
        await expect(tx).revertedWith('Require bid price above zero');
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
                paymentTokenAddress: payload.erc20Token1.address,
                sellPriority: 0
            }
        );
        await expect(tx).revertedWith('Require NFT ownership');
    });

    it('require approval', async () => {

        // change default marketplace to default

        const defaultMarketPlace = payload.operator.address;
        await payload.nft.setDefaultMarketPlace(defaultMarketPlace);


        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );

        const tx = marketplace.connect(payload.signer4).createAuction(
            {
                tokenId: projectId,
                share: 0,
                initialBid: 10,
                endAuction: new Date().getTime(),
                paymentTokenAddress: payload.erc20Token1.address,
                sellPriority: 0
            }
        );
        await expect(tx).revertedWith('Require NFT ownership transfer approval');

    });

    it('change default marketplace', async () => {
        const defaultMarketPlace = payload.marketplace.address;
        const tx = await payload.nft.setDefaultMarketPlace(defaultMarketPlace);

        const defaultMarketPlaceValue = await payload.nft.defaultMarketPlace();

        expect(defaultMarketPlaceValue).equal(defaultMarketPlace);
    });

    it('require not listed for sale', async () => {

        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );

        const tx1 = await marketplace.connect(payload.signer4).listNFTOnSale(
            {
                tokenId: projectId,
                share: 0,
                price: 10,
                paymentTokenAddress: payload.erc20Token1.address,
                sellPriority: 0
            }
        );
        const tx2 = marketplace.connect(payload.signer4).createAuction(
            {
                tokenId: projectId,
                share: 0,
                initialBid: 10,
                endAuction: new Date().getTime(),
                paymentTokenAddress: payload.erc20Token1.address,
                sellPriority: 0
            }
        );
        await expect(tx2).revertedWith('Already on sale');

        await await marketplace.connect(payload.signer4).removeNFTSale(
            payload.getSellId(projectId, payload.signer4.address)
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
            paymentTokenAddress: payload.deployer.address,
            sellPriority: 0
        });
        await expect(tx).revertedWith('Invalid payment token');
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
                paymentTokenAddress: payload.deployer.address,
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
                paymentTokenAddress: payload.erc20Token1.address,
                sellPriority: 0
            });
        expect(gas).equal(242469)
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

        const tx = marketplace.connect(payload.signer4).createAuction({
            tokenId: projectId,
            share: 0,
            initialBid: 1000,
            endAuction,
            paymentTokenAddress: payload.erc20Token1.address,
            sellPriority: sellPriority
        });
        const auctionId = payload.getSellId(projectId, seller);
        await expect(tx).emit(marketplace, 'NewAuction').withArgs(
            projectId,
            seller,
            auctionId,
            0,
            1000,
            endAuction,
            payload.erc20Token1.address,
            sellPriority
        )

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
            paymentTokenAddress: payload.deployer.address,
            sellPriority: 0
        });
        await expect(tx).revertedWith('Require input share to be above zero');
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
            paymentTokenAddress: payload.deployer.address,
            sellPriority: 0
        });
        await expect(tx).revertedWith('Owns less share than input');
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
            paymentTokenAddress: payload.erc20Token1.address,
            sellPriority: 0
        });
        await expect(tx).revertedWith('Owns less share than input');
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
            paymentTokenAddress: payload.erc20Token1.address,
            sellPriority: 0
        });
        expect(gas).equal(247845)
    })

    describe('createAuctionMeta', () => {

        // it('successful share auction', async () => {
        //     const marketplace = payload.marketplace;
        //     const projectId = payload.getProjectId(
        //         payload.projects["jsstore"]
        //     );
        // });

        it('successful share auction', async () => {
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

            const tx = marketplace.createAuctionMeta({
                signature: signature,
                to: from,
                deadline: deadline
            }, {
                tokenId: projectId,
                share: shareToAuction,
                initialBid: 10000,
                endAuction,
                paymentTokenAddress: payload.erc20Token1.address,
                sellPriority: 0
            });
            const auctionId = payload.getSellId(projectId, seller);
            await expect(tx).emit(marketplace, 'NewAuction').withArgs(
                projectId,
                seller,
                auctionId,
                shareToAuction,
                10000,
                endAuction,
                payload.erc20Token1.address,
                0
            )

            const shareOfMarketPlace = await payload.nft.shareOf(projectId, marketplace.address);
            expect(shareOfMarketPlace).equal(shareToAuction);

            const bidOwner = await marketplace.getBidOwner(auctionId);
            expect(bidOwner).equal(ethers.constants.AddressZero);


            const bidPrice = await marketplace.getBidPrice(auctionId);
            expect(bidPrice).equal(10000);

            const nativeCoinBalanceAfter = await nativeCoin.balanceOf(from);
            expect(nativeCoinBalanceAfter).equal(
                nativeCoinBalance
            )
        });

    })

}