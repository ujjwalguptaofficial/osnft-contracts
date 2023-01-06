import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { constants, ethers, providers, Wallet } from "ethers";
import { recoverTypedSignature, SignTypedDataVersion } from "@metamask/eth-sig-util";
import { recoverAddress } from "ethers/lib/utils";
import { IDeployedPayload } from "../interfaces";
import { time } from "@nomicfoundation/hardhat-network-helpers";

export enum NFT_TYPE {
    PercentageCut,
    Share,
    Equity,
    Direct
}

export function testMint(payload: IDeployedPayload) {

    const signMessage = async (user: SignerWithAddress, project: string, nftType: NFT_TYPE, totalShare: number, deadline: number) => {
        const domainType = [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
        ];
        const nftMintDataType = [
            { name: "projectUrl", type: "string" },
            { name: "nftType", type: "uint8" },
            { name: "totalShare", type: "uint32" },
            { name: "deadline", type: "uint256" },
        ];

        const domainData = {
            name: "OSNFT_RELAYER",
            version: "1",
            chainId: await user.getChainId(),
            verifyingContract: payload.relayer.address.toLowerCase(),
        };
        const message = {
            projectUrl: project,
            nftType: nftType,
            totalShare: totalShare,
            deadline: deadline
        };

        // const data = JSON.stringify({
        //     types: {
        //         EIP712Domain: domainType,
        //         NFTMintData: nftMintDataType,
        //     },
        //     domain: domainData,
        //     primaryType: "NFTMintData",
        //     message: message
        // });
        // const walletAddress = user.address;

        const signatureResult = await user._signTypedData(domainData, {
            NFTMintData: nftMintDataType,
        }, message);
        // recover

        const datas = {
            EIP712Domain: domainType,
            NFTMintData: nftMintDataType,
        };
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

    it('estimate gas', async () => {
        const nft = payload.nft;
        const relayer = payload.relayer;
        const timestamp = new Date().getTime();

        const signature = await signMessage(
            payload.deployer, payload.projects["jsstore-example"],
            0,
            30,
            timestamp
        );

        const gasForMintingWithSign = await relayer.estimateGas.mint(
            {
                signature,
                deadline: timestamp,
                to: payload.deployer.address,
            },
            payload.projects["jsstore-example"],
            0,
            30,
        );

        expect(gasForMintingWithSign).within(175754, 175778);


        const gasForMintingWithoutSign = await nft.estimateGas.mint(
            payload.projects["jsstore-example"],
            0,
            30
        );
        expect(gasForMintingWithoutSign).equal(154964);
    });


    describe('percentage cut', async () => {

        it('deadline change from what was signed', async () => {
            const nft = payload.nft;
            const relayer = payload.relayer;
            const deployerAddress = payload.deployer.address;
            const projectUrl = payload.projects["jsstore-example"];

            const expectedTokenId = payload.getProjectId(
                projectUrl
            );
            const timestampToSign = await time.latest() - 1000;
            const signature = await signMessage(payload.deployer, projectUrl, NFT_TYPE.PercentageCut, 30, timestampToSign);

            const timestamp = await time.latest() + 1000;

            const tx = relayer.mint({ signature, to: deployerAddress, deadline: timestamp }, projectUrl, NFT_TYPE.PercentageCut, 30);

            await expect(tx).revertedWith('Invalid signature');
        })

        it('Invalid relayer', async () => {
            const nft = payload.nft;
            const relayer = payload.relayer;
            const deployerAddress = payload.deployer.address;
            const projectUrl = payload.projects["jsstore-example"];

            const tx = nft.mintMeta(deployerAddress, projectUrl, NFT_TYPE.PercentageCut, 30);

            await expect(tx).revertedWith('Invalid relayer');
        })

        it('mint jsstore example to deployer', async () => {
            const nft = payload.nft;
            const relayer = payload.relayer;

            const deployerAddress = payload.deployer.address;
            const projectUrl = payload.projects["jsstore-example"];

            const oldBalance = await nft.balanceOf(deployerAddress);
            expect(oldBalance).equal(0);

            const expectedTokenId = payload.getProjectId(
                projectUrl
            );
            const timestamp = await time.latest() + 1000;
            const signature = await signMessage(payload.deployer, projectUrl, NFT_TYPE.PercentageCut, 30, timestamp);

            const tx = relayer.mint(
                { signature, to: deployerAddress, deadline: timestamp }, projectUrl, NFT_TYPE.PercentageCut, 30);
            await expect(tx).emit(nft, 'Transfer').withArgs(
                ethers.constants.AddressZero, deployerAddress, expectedTokenId
            );
            await expect(tx).emit(nft, 'ProjectAdded').withArgs(
                projectUrl, NFT_TYPE.PercentageCut, 30
            );

            console.log('expectedTokenId', expectedTokenId);

            const newBalance = await nft.balanceOf(deployerAddress);
            expect(newBalance).equal(1);

            let owner = await nft.ownerOf(
                expectedTokenId
            );
            expect(owner).equal(deployerAddress);

            payload.transactions['mintJsStoreExample'] = (await tx).hash
        })

        it('mint with invalid percentage', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            let balance = await nft.balanceOf(address);
            expect(balance).equal(0);

            const projectUrl1 = payload.projects["mahal-example"];

            let tx = nft.connect(payload.signer2).mint(projectUrl1, NFT_TYPE.PercentageCut, 51);
            await expect(tx).to.revertedWith('Require creator cut to be below 50');

            tx = nft.connect(payload.signer2).mint(projectUrl1, NFT_TYPE.PercentageCut, 50);
            await expect(tx).to.revertedWith('Require creator cut to be below 50');
        })

        it('mint mahal-examples for signer2 user', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            let balance = await nft.balanceOf(address);
            expect(balance).equal(0);

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'
            const expectedTokenId = payload.getProjectId(projectUrl1);

            const txToFail = nft.connect(payload.signer3).mint(projectUrl1, NFT_TYPE.PercentageCut, 40);

            await expect(txToFail).revertedWith('project not approved');

            const tx = nft.connect(payload.signer2).mint(projectUrl1, NFT_TYPE.PercentageCut, 40);
            await expect(tx).emit(nft, 'Transfer').withArgs(
                ethers.constants.AddressZero, address, expectedTokenId
            );

            await expect(tx).emit(nft, 'ProjectAdded').withArgs(
                projectUrl1, NFT_TYPE.PercentageCut, 40
            );

            balance = await nft.balanceOf(address);
            expect(balance).equal(1);

            payload.transactions['mintMahalExample'] = (await tx).hash;
        });



        it('mint by not approver', async () => {
            const nft = payload.nft;
            const relayer = payload.relayer;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-exampless'
            const timestamp = new Date().getTime();
            const signature = await signMessage(payload.signer2, projectUrl1, NFT_TYPE.PercentageCut, 30, timestamp);

            const tx = relayer.connect(payload.signer2).mint(
                { signature, to: address, deadline: timestamp }, projectUrl1, NFT_TYPE.PercentageCut, 30
            );
            // await expect(tx).revertedWith('Ownable: caller is not the owner')
            await expect(tx).revertedWith('project not approved');
        })

        it('mint already minted', async () => {
            const nft = payload.nft;
            const relayer = payload.relayer;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'
            const timestamp = await time.latest() + 1000;
            const signature = await signMessage(payload.signer2, projectUrl1, NFT_TYPE.PercentageCut, 30, timestamp);
            const tx = relayer.mint({
                signature, to: address, deadline: timestamp
            }, projectUrl1, NFT_TYPE.PercentageCut, 30);

            await expect(tx).to.revertedWith('ERC721: token already minted');
        })

        it('invalid signature', async () => {
            const nft = payload.nft;
            const relayer = payload.relayer;
            const address = payload.signer2.address;

            const projectUrl = 'github.com/ujjwalguptaofficial/mahal-exampless'
            const timestamp = new Date().getTime();
            const signature = await signMessage(payload.deployer, projectUrl, NFT_TYPE.PercentageCut, 30, timestamp);

            const tx = relayer.mint(
                { signature, to: address, deadline: timestamp }, projectUrl, NFT_TYPE.PercentageCut, 30
            );
            await expect(tx).revertedWith('Invalid signature')
        })

        it('Signature expired', async () => {
            const nft = payload.nft;
            const relayer = payload.relayer;
            const address = payload.signer2.address;

            const projectUrl = 'github.com/ujjwalguptaofficial/mahal-exampless'
            const timestamp = await time.latest() //new Date().getTime() - 1000000000;



            const signature = await signMessage(payload.deployer, projectUrl, NFT_TYPE.PercentageCut, 30, timestamp);

            const tx = relayer.mint(
                { signature, to: address, deadline: timestamp }, projectUrl, NFT_TYPE.PercentageCut, 30
            );
            await expect(tx).revertedWith('Signature expired')
        })

        it('mint mahal-webpack-loader for signer3 user - direct', async () => {
            const nft = payload.nft;
            const address = payload.signer3.address;

            let balance = await nft.balanceOf(address);
            expect(balance).equal(0);

            const projectUrl = payload.projects["mahal-webpack-loader"];
            const expectedTokenId = payload.getProjectId(projectUrl);

            // specifying 100 cut but value will be reseted to zero by contract
            const tx = nft.connect(payload.signer3).mint(projectUrl, NFT_TYPE.Direct, 100);
            await expect(tx).emit(nft, 'Transfer').withArgs(
                ethers.constants.AddressZero, address, expectedTokenId
            );

            await expect(tx).emit(nft, 'ProjectAdded').withArgs(
                projectUrl, NFT_TYPE.PercentageCut, 0
            );

            balance = await nft.balanceOf(address);
            expect(balance).equal(1);
        });

        it('mint godam-vue for signer4 user - to burn', async () => {
            const nft = payload.nft;
            const address = payload.signer4.address;

            let balance = await nft.balanceOf(address);
            expect(balance).equal(0);

            const projectUrl = payload.projects["godam-vue"];
            const expectedTokenId = payload.getProjectId(projectUrl);

            const tx = nft.connect(payload.signer4).mint(projectUrl, 0, 10);
            await expect(tx).emit(nft, 'Transfer').withArgs(
                ethers.constants.AddressZero, address, expectedTokenId
            );

            await expect(tx).emit(nft, 'ProjectAdded').withArgs(
                projectUrl, 0, 10
            );

            balance = await nft.balanceOf(address);
            expect(balance).equal(1);
        });

    })

    describe('shares', async () => {
        it('mint a project with shares more than uint32 max value', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'
            // const signature = await signMessage(payload.signer2, projectUrl1, 1, 4294967295 + 1);

            try {
                const tx = await nft.mint(projectUrl1, 1, 4294967295 + 1);
                throw "there should be error";
            } catch (error: any) {
                expect(error.message.includes('value out-of-bounds')).equal(true)
            }
        })

        it('mint a project with zero shares', async () => {
            const nft = payload.nft;
            const relayer = payload.relayer;
            const address = payload.signer2.address;
            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal'

            const timestamp = await time.latest() + 1000;

            const signature = await signMessage(payload.signer2, projectUrl1, NFT_TYPE.Share, 0, timestamp);

            const tx = relayer.mint({
                signature, to: address, deadline: timestamp
            }, projectUrl1, NFT_TYPE.Share, 0);
            await expect(tx).to.revertedWith('Total share should not be zero')
        })

        it('mint a percentage cut project with shares', async () => {
            const nft = payload.nft;
            const relayer = payload.relayer;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'

            const timestamp = await time.latest() + 1000;

            const signature = await signMessage(payload.signer2, projectUrl1, NFT_TYPE.Share, 10000, timestamp);

            const tx = relayer.mint({
                signature, to: address, deadline: timestamp
            },
                projectUrl1, NFT_TYPE.Share, 10000);

            await expect(tx).to.revertedWith('ERC721: token already minted');
        })

        it('mint mahal', async () => {
            const nft = payload.nft;
            const relayer = payload.relayer;
            const address = payload.signer2.address;

            let balance = await nft.balanceOf(address);
            expect(balance).equal(1);

            const projectUrl = payload.projects.mahal;
            const expectedTokenId = payload.getProjectId(projectUrl);
            const timestamp = await time.latest() + 1000;
            const signature = await signMessage(payload.signer2, projectUrl, NFT_TYPE.Share, 10000, timestamp);

            // check native token balance

            const nativeToken = payload.nativeToken;
            const nativeTokenBalanceOfUser = await nativeToken.balanceOf(address);

            const tx = relayer.mint({ signature, to: address, deadline: timestamp }, projectUrl, NFT_TYPE.Share, 10000);
            await expect(tx).emit(nft, 'Transfer').withArgs(
                ethers.constants.AddressZero,
                address,
                expectedTokenId
            );
            await expect(tx).emit(nft, 'ProjectAdded').withArgs(
                projectUrl, NFT_TYPE.Share, 10000
            );


            balance = await nft.balanceOf(address);
            expect(balance).equal(2);

            // check native token balance

            const nativeTokenBalanceOfUserAfterMint = await nativeToken.balanceOf(address);

            const approveInfo = await payload.approver.getApprovedProject(expectedTokenId);

            await expect(tx).emit(payload.nativeToken, 'Transfer').withArgs(
                address, constants.AddressZero, approveInfo.worth
            );

            expect(nativeTokenBalanceOfUser).equal(
                nativeTokenBalanceOfUserAfterMint.add(approveInfo.worth)
            );

            console.log("txhash", (await tx).hash)

            payload.transactions['mintMahal'] = (await tx).hash;
        });

        it('mint same project', async () => {
            const nft = payload.nft;
            const relayer = payload.relayer;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal'
            const expectedTokenId = payload.getProjectId(projectUrl1);
            const timestamp = new Date().getTime();

            const signature = await signMessage(payload.signer2, projectUrl1, NFT_TYPE.Share, 10000, timestamp);

            const tx = relayer.mint({
                signature, to: address, deadline: timestamp
            }, projectUrl1, NFT_TYPE.Share, 10000
            );

            await expect(tx).to.revertedWith('ERC721: token already minted');

        });

        it('mint share project with percentage cut', async () => {
            const nft = payload.nft;
            const relayer = payload.relayer;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal'
            const expectedTokenId = payload.getProjectId(projectUrl1);
            const timestamp = new Date().getTime();

            const signature = await signMessage(payload.signer2, projectUrl1, NFT_TYPE.Share, 0, timestamp);


            const tx = relayer.mint({ signature, to: address, deadline: timestamp }, projectUrl1, NFT_TYPE.Share, 0,);

            await expect(tx).to.revertedWith('ERC721: token already minted');

        });

        describe('mint jsstore without signature', () => {

            it('to not approved address', async () => {

                const nft = payload.nft;
                const projectUrl = payload.projects.jsstore;


                const tx = nft.connect(payload.signer2).mint(projectUrl, NFT_TYPE.Share, 10000);

                await expect(tx).revertedWith('project not approved')

            });

            it('to approved address', async () => {

                const nft = payload.nft;
                const address = payload.deployer.address;

                let balance = await nft.balanceOf(address);
                expect(balance).equal(1);

                const projectUrl = payload.projects.jsstore;

                const expectedTokenId = payload.getProjectId(projectUrl);

                const tx = nft.mint(projectUrl, NFT_TYPE.Share, 10000);
                await expect(tx).emit(nft, 'Transfer').withArgs(
                    ethers.constants.AddressZero,
                    address,
                    expectedTokenId
                );
                await expect(tx).emit(nft, 'ProjectAdded').withArgs(
                    projectUrl, NFT_TYPE.Share, 10000
                );

                balance = await nft.balanceOf(address);
                expect(balance).equal(2);

                payload.transactions['mintJsStore'] = (await tx).hash;

            });
        });

        it('project without approval by contract owner should revert', async () => {

            const nft = payload.nft;
            const projectUrl = "payload.projects.jsstore";

            const tx = nft.mint(projectUrl, NFT_TYPE.Share, 10000);

            await expect(tx).revertedWith('project not approved')

        });
    })

    describe('equity', async () => {

        it('mint godam', async () => {
            const nft = payload.nft;
            const relayer = payload.relayer;

            const address = payload.signer4.address;

            let balance = await nft.balanceOf(address);

            const projectUrl = payload.projects.godam;
            const expectedTokenId = payload.getProjectId(projectUrl);
            const timestamp = new Date().getTime();

            const signature = await signMessage(payload.signer4, projectUrl, NFT_TYPE.Equity, 0, timestamp);

            const tx = relayer.mint({
                signature, to: address, deadline: timestamp
            }, projectUrl, NFT_TYPE.Equity, 0);
            await expect(tx).emit(nft, 'Transfer').withArgs(
                ethers.constants.AddressZero,
                address,
                expectedTokenId
            );
            await expect(tx).emit(nft, 'ProjectAdded').withArgs(
                projectUrl, NFT_TYPE.Share, 100
            );

            const balanceAfterMint = await nft.balanceOf(address);
            expect(balanceAfterMint).equal(balance.add(1));

            console.log("txhash", (await tx).hash)
            payload.transactions['mintGodam'] = (await tx).hash;
        });

        it('mint same project', async () => {
            const nft = payload.nft;
            const relayer = payload.relayer;
            const address = payload.signer4.address;

            const projectUrl = payload.projects.godam;
            const expectedTokenId = payload.getProjectId(projectUrl);
            const timestamp = new Date().getTime();
            const signature = await signMessage(
                payload.signer4, projectUrl,
                NFT_TYPE.Share, 10000, timestamp
            );

            const tx = relayer.mint({ signature, to: address, deadline: timestamp }, projectUrl, NFT_TYPE.Share, 10000);

            await expect(tx).to.revertedWith('ERC721: token already minted');

        });

        it('mint solidity-learning for burn', async () => {
            const nft = payload.nft;
            const address = payload.deployer.address;

            let balance = await nft.balanceOf(address);

            const projectUrl = payload.projects["solidity-learning"];
            const expectedTokenId = payload.getProjectId(projectUrl);

            const tx = nft.mint(projectUrl, NFT_TYPE.Equity, 0);
            await expect(tx).emit(nft, 'Transfer').withArgs(
                ethers.constants.AddressZero,
                address,
                expectedTokenId
            );
            await expect(tx).emit(nft, 'ProjectAdded').withArgs(
                projectUrl, NFT_TYPE.Share, 100
            );

            const balanceAfterMint = await nft.balanceOf(address);
            expect(balanceAfterMint).equal(balance.add(1));
        });
    })


}