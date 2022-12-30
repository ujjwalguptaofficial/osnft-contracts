import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { IDeployedPayload } from "../interfaces";

export function testNFTSale(payload: IDeployedPayload) {

    const signMessage = async (user: SignerWithAddress, tokenId, share, price, erc20token) => {
        const domainType = [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
        ];
        const nftMintDataType = [
            { name: "tokenId", type: "bytes32" },
            { name: "share", type: "uint32" },
            { name: "price", type: "uint256" },
            { name: "erc20token", type: "address" },
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
            price,
            erc20token
        };

        // const data = JSON.stringify({
        //     types: {
        //         EIP712Domain: domainType,
        //         NFTMintData: nftMintDataType,
        //     },
        //     domain: domainData,
        //     primaryType: "NFTListOnSaleData",
        //     message: message
        // });
        // const walletAddress = user.address;

        const signatureResult = await user._signTypedData(domainData, {
            NFTListOnSaleData: nftMintDataType,
        }, message);
        // recover

        // const datas = {
        //     EIP712Domain: domainType,
        //     NFTMintData: nftMintDataType,
        // };
        // const result = recoverTypedSignature<SignTypedDataVersion.V4, typeof datas>({
        //     data: {
        //         types: {
        //             EIP712Domain: domainType,
        //             NFTMintData: nftMintDataType,
        //         },
        //         domain: domainData,
        //         primaryType: "NFTMintData",
        //         message: message
        //     },
        //     signature: signatureResult,
        //     version: SignTypedDataVersion.V4
        // });
        // expect(result).equal(user.address.toLowerCase());

        return signatureResult;
        // { data: payload.getProjectId(data), signature: signatureResult };
    }

    it("add nft on sale by non owner", async () => {
        const marketplace = payload.marketplace;
        const tx = marketplace.connect(payload.signer4).listNFTOnSale({
            tokenId: payload.getProjectId(
                payload.projects["jsstore-example"]
            ),
            share: 0,
            price: 1000000,
            paymentTokenAddress: payload.erc20Token1.address,
            sellPriority: 0
        });
        await expect(tx).revertedWith('Require NFT ownership');
    });

    it("not approved for marketplace", async () => {

        // change default marketplace

        await payload.nft.setDefaultMarketPlace(payload.operator.address);

        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );

        const tx = marketplace.connect(payload.signer3).listNFTOnSale(
            {
                tokenId: projectId,
                share: 0,
                price: 10000000000,
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

    it("estimate gas", async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const price = 10000000000;
        const tx = await marketplace.connect(payload.signer3).estimateGas.listNFTOnSale({
            tokenId,
            share: 0,
            price,
            paymentTokenAddress: payload.erc20Token1.address,
            sellPriority: 0
        });

        expect(tx).equal(160869);
    });


    it('not existing token', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            "ffgg"
        );

        const tx = marketplace.listNFTOnSale({
            tokenId: projectId,
            share: 0,
            price: 10,
            paymentTokenAddress: payload.deployer.address,
            sellPriority: 0
        });
        await expect(tx).revertedWith('ERC721: invalid token ID');
    });

    it("price zero", async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const tx = marketplace.connect(payload.signer3).estimateGas.listNFTOnSale({
            tokenId,
            share: 0,
            price: 0,
            paymentTokenAddress: payload.erc20Token1.address,
            sellPriority: 0
        });

        await expect(tx).revertedWith('Price must be above zero');
    });


    it("non payable token", async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const price = 10000000000;
        const tx = marketplace.connect(payload.signer3).estimateGas.listNFTOnSale({
            tokenId,
            share: 0,
            price,
            paymentTokenAddress: payload.marketplace.address,
            sellPriority: 0
        });

        await expect(tx).revertedWith('Invalid payment token');
    });


    it("add jsstore-example (percentage cut) on sale", async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const price = 10000000000;

        const nativeCoin = payload.nativeToken;
        const from = payload.signer3.address;
        const nativeCoinBalance = await nativeCoin.balanceOf(from);

        const tx = marketplace.connect(payload.signer3).listNFTOnSale({
            tokenId,
            share: 0,
            price,
            paymentTokenAddress: payload.erc20Token1.address,
            sellPriority: 0
        });
        const sellId = payload.getSellId(tokenId, from);
        await expect(tx).emit(marketplace, 'NFTSaleAdded').withArgs(
            tokenId,
            from,
            sellId,
            0,
            price,
            payload.erc20Token1.address,
            0
        );

        const nftData = await marketplace.getNFTFromSale(sellId);

        expect(nftData.seller).equal(from);
        expect(nftData.paymentTokenAddress).equal(payload.erc20Token1.address);
        expect(nftData.share).equal(0);
        expect(nftData.price).equal(price);
        expect(nftData.tokenId).equal(tokenId);
        expect(nftData.sellPriority).equal(0);

        const nativeCoinBalanceAfter = await nativeCoin.balanceOf(from);
        expect(nativeCoinBalanceAfter).equal(
            nativeCoinBalance
        )

    });


    it("add listed item on sale again", async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const price = 10000000000;
        const tx = marketplace.connect(payload.signer3).listNFTOnSale({
            tokenId,
            share: 0,
            price,
            paymentTokenAddress: payload.erc20Token1.address,
            sellPriority: 0
        });

        await expect(tx).revertedWith('Already on sale');
    });


    it('add share token on sale with zero share', async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["jsstore"]
        );
        const price = 10000000000;
        const tx = marketplace.connect(payload.signer4).listNFTOnSale({
            tokenId,
            share: 0,
            price,
            paymentTokenAddress: payload.marketplace.address,
            sellPriority: 0
        });

        await expect(tx).revertedWith('Require input share to be above zero');
    });

    describe('add share token on sale with share more than have', async () => {

        it('owner have zero share', async () => {
            const marketplace = payload.marketplace;
            const tokenId = payload.getProjectId(
                payload.projects["jsstore"]
            );
            const price = 10000000000;
            const shareOf = await payload.nft.connect(payload.signer4).shareOf(tokenId, payload.signer4.address);
            expect(shareOf).equal(0);
            const tx = marketplace.connect(payload.signer4).listNFTOnSale({
                tokenId,
                share: shareOf + 1,
                price,
                paymentTokenAddress: payload.marketplace.address,
                sellPriority: 0
            });

            await expect(tx).revertedWith('Owns less share than input');
        })

        it('owner have share more than zero', async () => {
            const marketplace = payload.marketplace;
            const tokenId = payload.getProjectId(
                payload.projects["mahal"]
            );
            const price = 10000000000;
            const shareOf = await payload.nft.shareOf(tokenId, payload.signer2.address);
            expect(shareOf).greaterThan(0);

            const tx = marketplace.connect(payload.signer2).listNFTOnSale({
                tokenId,
                share: shareOf + 1,
                price,
                paymentTokenAddress: payload.marketplace.address,
                sellPriority: 0
            });

            await expect(tx).revertedWith('Owns less share than input');
        })

    });

    it('add share token on sale', async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["jsstore"]
        );
        const price = 10000000000;
        const shareToSell = 100;

        const shareOf = await payload.nft.connect(payload.signer3).shareOf(tokenId, payload.signer3.address);
        expect(shareOf).greaterThan(shareToSell);

        const nativeCoin = payload.nativeToken;
        const from = payload.signer3.address;
        const nativeCoinBalance = await nativeCoin.balanceOf(from);

        const tx = marketplace.connect(payload.signer3).listNFTOnSale({
            tokenId,
            share: shareToSell,
            price,
            paymentTokenAddress: payload.erc20Token1.address,
            sellPriority: 1
        });
        const sellId = payload.getSellId(tokenId, from);
        await expect(tx).emit(marketplace, 'NFTSaleAdded').withArgs(
            tokenId,
            from,
            sellId,
            shareToSell,
            price,
            payload.erc20Token1.address,
            1
        );

        const nftData = await marketplace.getNFTFromSale(sellId);

        expect(nftData.seller).equal(from);
        expect(nftData.paymentTokenAddress).equal(payload.erc20Token1.address);
        expect(nftData.share).equal(shareToSell);
        expect(nftData.price).equal(price);
        expect(nftData.tokenId).equal(tokenId);
        expect(nftData.sellPriority).equal(1);

        const nativeCoinBalanceAfter = await nativeCoin.balanceOf(from);
        const expectedDeduction = BigNumber.from(10).pow(15).mul(nftData.sellPriority);
        expect(nativeCoinBalanceAfter).equal(
            nativeCoinBalance.sub(expectedDeduction)
        )

    });

    it('add share token again on sale', async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["jsstore"]
        );
        const price = 10000000000;
        const shareToSell = 100;

        const shareOf = await payload.nft.connect(payload.signer3).shareOf(tokenId, payload.signer3.address);
        expect(shareOf).greaterThan(shareToSell);

        const tx = marketplace.connect(payload.signer3).listNFTOnSale({
            tokenId,
            share: shareToSell,
            price,
            paymentTokenAddress: payload.erc20Token1.address,
            sellPriority: 0
        });
        await expect(tx).revertedWith('Already on sale')

    });

    it("add mahal-example (percentage cut) on sale", async () => {
        const marketplace = payload.marketplace;
        const tokenId = payload.getProjectId(
            payload.projects["mahal-example"]
        );
        const price = 10000000005;
        const nativeCoin = payload.nativeToken;
        const from = payload.signer2.address;
        const nativeCoinBalance = await nativeCoin.balanceOf(from);
        const tx = marketplace.connect(payload.signer2).listNFTOnSale({
            tokenId,
            share: 0,
            price,
            paymentTokenAddress: payload.erc20Token1.address,
            sellPriority: 100
        });
        const sellId = payload.getSellId(tokenId, from);
        await expect(tx).emit(marketplace, 'NFTSaleAdded').withArgs(
            tokenId,
            from,
            sellId,
            0,
            price,
            payload.erc20Token1.address,
            100
        );

        const nftData = await marketplace.getNFTFromSale(sellId);

        expect(nftData.seller).equal(from);
        expect(nftData.paymentTokenAddress).equal(payload.erc20Token1.address);
        expect(nftData.share).equal(0);
        expect(nftData.price).equal(price);
        expect(nftData.tokenId).equal(tokenId);
        expect(nftData.sellPriority).equal(100);

        const nativeCoinBalanceAfter = await nativeCoin.balanceOf(from);
        const expectedDeduction = BigNumber.from(10).pow(15).mul(nftData.sellPriority);
        expect(nativeCoinBalanceAfter).equal(
            nativeCoinBalance.sub(expectedDeduction)
        )

    });

    describe("sell using meta sign", () => {

        it("Invalid signature", async () => {
            const marketplace = payload.marketplace;
            const tokenId = payload.getProjectId(
                payload.projects["mahal-webpack-loader"]
            );
            const price = ethers.constants.MaxUint256.sub(1);
            const erc20token = payload.erc20Token2.address;
            const signature = await signMessage(payload.signer3, tokenId, 0, price, erc20token)
            const tx = marketplace.listNFTOnSaleMeta(
                signature,
                payload.signer2.address,
                {
                    tokenId,
                    share: 0,
                    price,
                    paymentTokenAddress: erc20token,
                    sellPriority: 0
                }
            );

            await expect(tx).to.revertedWith('Invalid signature');
        });

        it("Valid signature but now owner", async () => {
            const marketplace = payload.marketplace;
            const tokenId = payload.getProjectId(
                payload.projects["mahal-webpack-loader"]
            );
            const price = ethers.constants.MaxUint256.sub(1);
            const erc20token = payload.erc20Token2.address;
            const signature = await signMessage(payload.signer2, tokenId, 0, price, erc20token)
            const from = payload.signer2.address;
            const tx = marketplace.listNFTOnSaleMeta(
                signature,
                from,
                {
                    tokenId,
                    share: 0,
                    price,
                    paymentTokenAddress: erc20token,
                    sellPriority: 0
                }
            );

            await expect(tx).to.revertedWith('Require NFT ownership');
        });

        it("add mahal-webpack-loader (percentage cut) on sale", async () => {
            const marketplace = payload.marketplace;
            const tokenId = payload.getProjectId(
                payload.projects["mahal-webpack-loader"]
            );
            const price = ethers.constants.MaxUint256.sub(1);
            const erc20token = payload.erc20Token2.address;
            const signature = await signMessage(payload.signer3, tokenId, 0, price, erc20token)
            const from = payload.signer3.address;
            const tx = marketplace.listNFTOnSaleMeta(
                signature,
                from,
                {
                    tokenId,
                    share: 0,
                    price,
                    paymentTokenAddress: erc20token,
                    sellPriority: 0
                }
            );
            const sellId = payload.getSellId(tokenId, from);
            await expect(tx).emit(marketplace, 'NFTSaleAdded').withArgs(
                tokenId,
                from,
                sellId,
                0,
                price,
                payload.erc20Token2.address,
                0
            );

            const nftData = await marketplace.getNFTFromSale(sellId);

            expect(nftData.seller).equal(from);
            expect(nftData.paymentTokenAddress).equal(payload.erc20Token2.address);
            expect(nftData.share).equal(0);
            expect(nftData.price).equal(price);
            expect(nftData.tokenId).equal(tokenId);
            expect(nftData.sellPriority).equal(0);

        });
    })

}
