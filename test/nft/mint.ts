import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import { IDeployedPayload } from "../interfaces";

export function testMint(payload: IDeployedPayload) {

    const signMessage = async (user: SignerWithAddress, project: string) => {
        const message = `
        Hi! 
        
        I am requesting to mint the project - ${project} 
        
        `;
        // const data = ethers.utils.solidityKeccak256(["bytes"], [message]);
        const data = payload.getProjectId(message);
        const hashedMessage = await user.signMessage(ethers.utils.arrayify(data));
        return { data: data, signature: hashedMessage };
    }

    it('estimate gas', async () => {
        const nft = payload.nft;
        const { data, signature } = await signMessage(payload.deployer, payload.projects["jsstore-example"]);

        const gasForMintingWithSign = await nft.estimateGas.mintTo(
            data, signature,
            payload.deployer.address, payload.projects["jsstore-example"],
            0,
            30
        );
        expect(gasForMintingWithSign).equal(187145);

        const gasForMintingWithoutSign = await nft.estimateGas.mint(
            payload.projects["jsstore-example"],
            0,
            30
        );
        expect(gasForMintingWithoutSign).equal(176629);
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

            const { data, signature } = await signMessage(payload.deployer, projectUrl);

            const tx = nft.mintTo(data, signature, deployerAddress, projectUrl, 0, 30);
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

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'

            let tx = nft.connect(payload.signer2).mint(projectUrl1, 0, 101);
            await expect(tx).to.revertedWith('Require total share to be below 100');

            tx = nft.connect(payload.signer2).mint(projectUrl1, 0, 100);
            await expect(tx).to.revertedWith('Require total share to be below 100');
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
            const { data, signature } = await signMessage(payload.signer2, projectUrl1);

            const tx = nft.connect(payload.signer2).mintTo(
                data, signature, address, projectUrl1, 0, 30
            );
            await expect(tx).revertedWith('Ownable: caller is not the owner')
        })

        it('mint already minted', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'
            const { data, signature } = await signMessage(payload.signer2, projectUrl1);
            const tx = nft.mintTo(data, signature, address, projectUrl1, 0, 30);

            await expect(tx).to.revertedWith('ERC721: token already minted');
        })

        it('invalid signature', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl = 'github.com/ujjwalguptaofficial/mahal-exampless'
            const { data, signature } = await signMessage(payload.deployer, projectUrl);

            const tx = nft.mintTo(
                data, signature, address, projectUrl, 0, 30
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
            const { data, signature } = await signMessage(payload.signer2, projectUrl1);

            try {
                const tx = await nft.mintTo(data, signature, address, projectUrl1, 1, 4294967295 + 1);
                throw "there should be error";
            } catch (error: any) {
                expect(error.message.includes('value out-of-bounds')).equal(true)
            }
        })

        it('mint a project with zero shares', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;
            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal'
            const { data, signature } = await signMessage(payload.signer2, projectUrl1);

            const tx = nft.mintTo(data, signature, address, projectUrl1, 1, 0);
            await expect(tx).to.revertedWith('Total share should not be zero')
        })

        it('mint a percentage cut project with shares', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'
            const { data, signature } = await signMessage(payload.signer2, projectUrl1);

            const tx = nft.mintTo(data, signature, address, projectUrl1, 1, 10000);

            await expect(tx).to.revertedWith('ERC721: token already minted');
        })

        it('mint mahal', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            let balance = await nft.balanceOf(address);
            expect(balance).equal(1);

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal'
            const expectedTokenId = payload.getProjectId(projectUrl1);
            const { data, signature } = await signMessage(payload.signer2, projectUrl1);

            const tx = nft.mintTo(data, signature, address, projectUrl1, 1, 10000);
            await expect(tx).emit(nft, 'Transfer').withArgs(
                ethers.constants.AddressZero,
                address,
                expectedTokenId
            );
            await expect(tx).emit(nft, 'ProjectAdded').withArgs(
                projectUrl1, 1, 10000
            );

            balance = await nft.balanceOf(address);
            expect(balance).equal(2);
        });

        it('mint same project', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal'
            const expectedTokenId = payload.getProjectId(projectUrl1);

            const { data, signature } = await signMessage(payload.signer2, projectUrl1);

            const tx = nft.mintTo(data, signature, address, projectUrl1, 1, 10000);

            await expect(tx).to.revertedWith('ERC721: token already minted');

        });

        it('mint share project with percentage cut', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal'
            const expectedTokenId = payload.getProjectId(projectUrl1);

            const { data, signature } = await signMessage(payload.signer2, projectUrl1);


            const tx = nft.mintTo(data, signature, address, projectUrl1, 1, 0);

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
            const { data, signature } = await signMessage(payload.signer4, projectUrl);

            const tx = nft.mintTo(data, signature, address, projectUrl, 2, 0);
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

            const { data, signature } = await signMessage(payload.signer4, projectUrl);

            const tx = nft.mintTo(data, signature, address, projectUrl, 1, 10000);

            await expect(tx).to.revertedWith('ERC721: token already minted');

        });
    })


}