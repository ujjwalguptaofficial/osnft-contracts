import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { constants, ethers, providers, Wallet } from "ethers";
import { recoverTypedSignature, SignTypedDataVersion } from "@metamask/eth-sig-util";
import { recoverAddress } from "ethers/lib/utils";
import { IDeployedPayload } from "../interfaces";

export function testMint(payload: IDeployedPayload) {

    const signMessage = async (user: SignerWithAddress, project: string, nftType: number, totalShare: number) => {
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
        ];

        const domainData = {
            name: "OSNFT",
            version: "1",
            chainId: await user.getChainId(),
            verifyingContract: payload.nft.address.toLowerCase(),
        };
        const message = {
            projectUrl: project,
            nftType: nftType,
            totalShare: totalShare
        };

        const data = JSON.stringify({
            types: {
                EIP712Domain: domainType,
                NFTMintData: nftMintDataType,
            },
            domain: domainData,
            primaryType: "NFTMintData",
            message: message
        });
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
        const signature = await signMessage(
            payload.deployer, payload.projects["jsstore-example"],
            0,
            30
        );

        const gasForMintingWithSign = await nft.estimateGas.mintTo(
            signature,
            payload.deployer.address, payload.projects["jsstore-example"],
            0,
            30
        );

        expect(gasForMintingWithSign).equal(171095);


        const gasForMintingWithoutSign = await nft.estimateGas.mint(
            payload.projects["jsstore-example"],
            0,
            30
        );
        expect(gasForMintingWithoutSign).equal(154871);
    });

    describe('percentage cut', async () => {

        it('mint jsstore exampl to deployer', async () => {
            const nft = payload.nft;
            const deployerAddress = payload.deployer.address;
            const projectUrl = payload.projects["jsstore-example"];

            const oldBalance = await nft.balanceOf(deployerAddress);
            expect(oldBalance).equal(0);

            const expectedTokenId = payload.getProjectId(
                projectUrl
            );

            const signature = await signMessage(payload.deployer, projectUrl, 0, 30);

            const tx = nft.mintTo(signature, deployerAddress, projectUrl, 0, 30);
            await expect(tx).emit(nft, 'Transfer').withArgs(
                ethers.constants.AddressZero, deployerAddress, expectedTokenId
            );
            await expect(tx).emit(nft, 'ProjectAdded').withArgs(
                projectUrl, 0, 30
            );

            console.log('expectedTokenId', expectedTokenId);

            const newBalance = await nft.balanceOf(deployerAddress);
            expect(newBalance).equal(1);

            let owner = await nft.ownerOf(
                expectedTokenId
            );
            expect(owner).equal(deployerAddress);
        })

        it('mint with invalid percentage', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            let balance = await nft.balanceOf(address);
            expect(balance).equal(0);

            const projectUrl1 = payload.projects["mahal-example"];

            let tx = nft.connect(payload.signer2).mint(projectUrl1, 0, 101);
            await expect(tx).to.revertedWith('Require creator cut to be below 100');

            tx = nft.connect(payload.signer2).mint(projectUrl1, 0, 100);
            await expect(tx).to.revertedWith('Require creator cut to be below 100');
        })

        it('mint mahal-examples for signer2 user', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            let balance = await nft.balanceOf(address);
            expect(balance).equal(0);

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'
            const expectedTokenId = payload.getProjectId(projectUrl1);

            const txToFail = nft.connect(payload.signer3).mint(projectUrl1, 0, 40);

            await expect(txToFail).revertedWith('project not approved');

            const tx = nft.connect(payload.signer2).mint(projectUrl1, 0, 40);
            await expect(tx).emit(nft, 'Transfer').withArgs(
                ethers.constants.AddressZero, address, expectedTokenId
            );

            await expect(tx).emit(nft, 'ProjectAdded').withArgs(
                projectUrl1, 0, 40
            );

            balance = await nft.balanceOf(address);
            expect(balance).equal(1);
        });



        it('mint by not approver', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-exampless'
            const signature = await signMessage(payload.signer2, projectUrl1, 0, 30);

            const tx = nft.connect(payload.signer2).mintTo(
                signature, address, projectUrl1, 0, 30
            );
            await expect(tx).revertedWith('Ownable: caller is not the owner')
        })

        it('mint already minted', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'
            const signature = await signMessage(payload.signer2, projectUrl1, 0, 30);
            const tx = nft.mintTo(signature, address, projectUrl1, 0, 30);

            await expect(tx).to.revertedWith('ERC721: token already minted');
        })

        it('invalid signature', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl = 'github.com/ujjwalguptaofficial/mahal-exampless'
            const signature = await signMessage(payload.deployer, projectUrl, 0, 30);

            const tx = nft.mintTo(
                signature, address, projectUrl, 0, 30
            );
            await expect(tx).revertedWith('invalid signature')
        })

        it('mint mahal-webpack-loader for signer3 user - 0% percentage cut', async () => {
            const nft = payload.nft;
            const address = payload.signer3.address;

            let balance = await nft.balanceOf(address);
            expect(balance).equal(0);

            const projectUrl = payload.projects["mahal-webpack-loader"];
            const expectedTokenId = payload.getProjectId(projectUrl);

            const tx = nft.connect(payload.signer3).mint(projectUrl, 0, 0);
            await expect(tx).emit(nft, 'Transfer').withArgs(
                ethers.constants.AddressZero, address, expectedTokenId
            );

            await expect(tx).emit(nft, 'ProjectAdded').withArgs(
                projectUrl, 0, 0
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
            const address = payload.signer2.address;
            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal'
            const signature = await signMessage(payload.signer2, projectUrl1, 1, 0);

            const tx = nft.mintTo(signature, address, projectUrl1, 1, 0);
            await expect(tx).to.revertedWith('Total share should not be zero')
        })

        it('mint a percentage cut project with shares', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'
            const signature = await signMessage(payload.signer2, projectUrl1, 1, 10000);

            const tx = nft.mintTo(signature, address, projectUrl1, 1, 10000);

            await expect(tx).to.revertedWith('ERC721: token already minted');
        })

        it('mint mahal', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            let balance = await nft.balanceOf(address);
            expect(balance).equal(1);

            const projectUrl = payload.projects.mahal;
            const expectedTokenId = payload.getProjectId(projectUrl);
            const signature = await signMessage(payload.signer2, projectUrl, 1, 10000);

            // check native token balance

            const nativeToken = payload.nativeToken;
            const nativeTokenBalanceOfUser = await nativeToken.balanceOf(address);

            const tx = nft.mintTo(signature, address, projectUrl, 1, 10000);
            await expect(tx).emit(nft, 'Transfer').withArgs(
                ethers.constants.AddressZero,
                address,
                expectedTokenId
            );
            await expect(tx).emit(nft, 'ProjectAdded').withArgs(
                projectUrl, 1, 10000
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

            console.log('marketplace address', payload.marketplace.address);

        });

        it('mint same project', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal'
            const expectedTokenId = payload.getProjectId(projectUrl1);

            const signature = await signMessage(payload.signer2, projectUrl1, 1, 10000);

            const tx = nft.mintTo(signature, address, projectUrl1, 1, 10000);

            await expect(tx).to.revertedWith('ERC721: token already minted');

        });

        it('mint share project with percentage cut', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal'
            const expectedTokenId = payload.getProjectId(projectUrl1);

            const signature = await signMessage(payload.signer2, projectUrl1, 1, 0);


            const tx = nft.mintTo(signature, address, projectUrl1, 1, 0);

            await expect(tx).to.revertedWith('ERC721: token already minted');

        });

        describe('mint jsstore without signature', () => {

            it('to not approved address', async () => {

                const nft = payload.nft;
                const projectUrl = payload.projects.jsstore;


                const tx = nft.connect(payload.signer2).mint(projectUrl, 1, 10000);

                await expect(tx).revertedWith('project not approved')

            });

            it('to approved address', async () => {

                const nft = payload.nft;
                const address = payload.deployer.address;

                let balance = await nft.balanceOf(address);
                expect(balance).equal(1);

                const projectUrl = payload.projects.jsstore;

                const expectedTokenId = payload.getProjectId(projectUrl);

                const tx = nft.mint(projectUrl, 1, 10000);
                await expect(tx).emit(nft, 'Transfer').withArgs(
                    ethers.constants.AddressZero,
                    address,
                    expectedTokenId
                );
                await expect(tx).emit(nft, 'ProjectAdded').withArgs(
                    projectUrl, 1, 10000
                );

                balance = await nft.balanceOf(address);
                expect(balance).equal(2);
            });
        });

        it('project without approval by contract owner should revert', async () => {

            const nft = payload.nft;
            const projectUrl = "payload.projects.jsstore";

            const tx = nft.mint(projectUrl, 1, 10000);

            await expect(tx).revertedWith('project not approved')

        });
    })

    describe('equity', async () => {

        it('mint godam', async () => {
            const nft = payload.nft;
            const address = payload.signer4.address;

            let balance = await nft.balanceOf(address);

            const projectUrl = payload.projects.godam;
            const expectedTokenId = payload.getProjectId(projectUrl);
            const signature = await signMessage(payload.signer4, projectUrl, 2, 0);

            const tx = nft.mintTo(signature, address, projectUrl, 2, 0);
            await expect(tx).emit(nft, 'Transfer').withArgs(
                ethers.constants.AddressZero,
                address,
                expectedTokenId
            );
            await expect(tx).emit(nft, 'ProjectAdded').withArgs(
                projectUrl, 1, 100
            );

            const balanceAfterMint = await nft.balanceOf(address);
            expect(balanceAfterMint).equal(balance.add(1));
        });

        it('mint same project', async () => {
            const nft = payload.nft;
            const address = payload.signer4.address;

            const projectUrl = payload.projects.godam;
            const expectedTokenId = payload.getProjectId(projectUrl);

            const signature = await signMessage(
                payload.signer4, projectUrl,
                1, 10000
            );

            const tx = nft.mintTo(signature, address, projectUrl, 1, 10000);

            await expect(tx).to.revertedWith('ERC721: token already minted');

        });
    })


}