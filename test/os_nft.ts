import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { arrayify, keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat"
import { describe } from "mocha";
import { OSNFT } from "../typechain-types";


function getProjectId(projectUrl: string) {
    return ethers.utils.keccak256(
        toUtf8Bytes(projectUrl)
    );
}

describe("ujjwal NFT", () => {
    let signer1: SignerWithAddress,
        signer2: SignerWithAddress,
        signer3: SignerWithAddress,
        operator: SignerWithAddress;

    let nft: OSNFT;

    const projectUrl = `github.com/ujjwalguptaofficial/jsstore-examples`;

    before(async () => {
        [signer1, signer2, signer3, operator] = await ethers.getSigners();
        const ct = await ethers.getContractFactory('OSNFT');
        nft = await upgrades.deployProxy(ct, ['OpenSourceNFT', 'OS', 'https://ujjwalnft.com/metadata/'], {
            initializer: 'initialize',
        }) as any;
        await nft.deployed();
    })

    describe('public state', () => {
        it('name', async () => {
            const value = await nft.name();
            expect(value).equal('OpenSourceNFT');
        })

        it('symbol', async () => {
            const value = await nft.symbol();
            expect(value).equal('OS');
        })

        it('baseTokenURI', async () => {
            const value = await nft.baseTokenURI();
            expect(value).equal('https://ujjwalnft.com/metadata/');
        })
    })

    describe('owner', () => {

        it('owner address', async () => {
            const ownerAddress = await nft.owner();
            expect(ownerAddress).equal(signer1.address);
        })

        describe('setBaseTokenURI', async () => {

            it('estimate gas', async () => {
                const value = await nft.estimateGas.setBaseTokenURI('https://ujjwalnft.com/metadata/')
                expect(value).equal(37256);
            })

            it('transaction', async () => {
                await nft.setBaseTokenURI('https://ujjwalnft.com/')

                let value = await nft.baseTokenURI();
                expect(value).equal('https://ujjwalnft.com/');

                await nft.setBaseTokenURI('https://ujjwalnft.com/metadata/')

                value = await nft.baseTokenURI();
                expect(value).equal('https://ujjwalnft.com/metadata/');


            })
        })

        describe('mint', async () => {

            it('estimate gas', async () => {
                const gas = await nft.estimateGas.mintTo(signer1.address, projectUrl);
                // expect(gas).equal(195491);
                expect(gas).equal(149531);
            })

            it('transaction', async () => {
                let balance = await nft.balanceOf(signer1.address);
                expect(balance).equal(0);

                const expectedTokenId = getProjectId(
                    projectUrl
                );
                const tx = nft.mintTo(signer1.address, projectUrl);
                await expect(tx).emit(nft, 'Transfer').withArgs(
                    ethers.constants.AddressZero, signer1.address, expectedTokenId
                );

                console.log('expectedTokenId', expectedTokenId);

                balance = await nft.balanceOf(signer1.address);
                expect(balance).equal(1);

                let owner = await nft.ownerOf(
                    expectedTokenId
                );
                expect(owner).equal(signer1.address);
            })

            it('transaction mint for general user', async () => {

                let balance = await nft.balanceOf(signer2.address);
                expect(balance).equal(0);

                const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'
                const expectedTokenId = getProjectId(projectUrl1);
                const tx = nft.mintTo(signer2.address, projectUrl1);
                await expect(tx).emit(nft, 'Transfer').withArgs(
                    ethers.constants.AddressZero, signer2.address, expectedTokenId
                );

                balance = await nft.balanceOf(signer2.address);
                expect(balance).equal(1);
            })

            it('projectUrlByTokenId', async () => {
                const expectedTokenId = getProjectId(projectUrl);
                let projectUrlFromContract = await nft.projectUrlByTokenId(
                    expectedTokenId
                );
                expect(projectUrlFromContract).equal(projectUrl);
            })
        })
    })

    describe('users method', () => {

        it('balance of', async () => {
            let balance = await nft.balanceOf(signer3.address);
            expect(balance).equal(0);
        });

        it('tokenURI', async () => {
            const projectId = getProjectId(projectUrl);
            const value = await nft.tokenURI(
                projectId
            );
            expect(value.toLowerCase()).equal('https://ujjwalnft.com/metadata/' + projectId.toLowerCase());
        })

        describe('transfer from', async () => {

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'
            const projectId = getProjectId(projectUrl1);

            it('estimate gas', async () => {
                const value = await nft.connect(signer2).estimateGas.transferFrom(
                    signer2.address, signer3.address,
                    projectId
                );
                expect(value).equal(68732);
            })

            it('transaction', async () => {
                const tx = nft.connect(signer2).transferFrom(signer2.address, signer3.address, projectId);
                await expect(tx).emit(nft, 'Transfer').withArgs(
                    signer2.address, signer3.address, projectId
                );

                let balance = await nft.balanceOf(signer3.address);
                expect(balance).equal(1);

                balance = await nft.balanceOf(signer2.address);
                expect(balance).equal(0);
            });

            it('owner of', async () => {
                const owner = await nft.ownerOf(
                    getProjectId(projectUrl1)
                );
                expect(owner).equal(signer3.address);
            })
        })

        describe('setApproveForAll', async () => {
            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-creator'
            const projectId = getProjectId(projectUrl1);

            it('estimate gas', async () => {
                const value = await nft.estimateGas.setApprovalForAll(operator.address, true);
                expect(value).equal(54401);
            })

            it('mint for user3', async () => {
                const tx = nft.mintTo(signer3.address, projectUrl1);
                await expect(tx).emit(nft, 'Transfer').withArgs(
                    ethers.constants.AddressZero, signer3.address,
                    projectId
                );

                let balance = await nft.balanceOf(signer3.address);
                expect(balance).equal(2);

                const owner = await nft.ownerOf(
                    projectId
                );
                expect(owner).equal(signer3.address);
            })

            // it('transaction', async () => {
            //     const tx = nft.connect(signer3).setApprovalForAll(operator.address, true);
            //     await expect(tx).emit(nft, 'ApprovalForAll').withArgs(
            //         signer3.address, operator.address, true
            //     )

            //     let isApproved = await nft.isApprovedForAll(signer3.address, operator.address);
            //     expect(isApproved).equal(true);

            //     isApproved = await nft.isApprovedForAll(signer2.address, operator.address);
            //     expect(isApproved).equal(false);
            // })

            // it('transfer by operator', async () => {
            //     let balance = await nft.balanceOf(operator.address);
            //     expect(balance).equal(0);

            //     const tx = nft.connect(operator).transferFrom(signer3.address, operator.address, 3);
            //     await expect(tx).emit(nft, 'Transfer').withArgs(
            //         signer3.address, operator.address, 3
            //     );

            //     balance = await nft.balanceOf(operator.address);
            //     expect(balance).equal(1);

            //     balance = await nft.balanceOf(signer3.address);
            //     expect(balance).equal(1);

            //     const owner = await nft.ownerOf(3);
            //     expect(owner).equal(operator.address);
            // })
        })
    })

    describe('reverted', () => {
        it('initialized should revert', async () => {
            const tx = nft.initialize('UjjwalNFT', 'UNFT', 'https://ujjwalnft.com/metadata');
            await expect(tx).to.be.revertedWith('Initializable: contract is already initialized')
        })

        it('transfer to zero address should be reverted', async () => {
            const tx = nft.transferFrom(signer1.address, ethers.constants.AddressZero,
                getProjectId(projectUrl)
            );
            await expect(tx).to.be.revertedWith('ERC721: transfer to the zero address')
        })

        it('transfer from incorrect owner should be reverted', async () => {
            const tx = nft.transferFrom(signer2.address, ethers.constants.AddressZero, getProjectId(projectUrl));
            await expect(tx).to.be.revertedWith('ERC721: transfer from incorrect owner')
        })

        it('transfer on another behalf when not approved', async () => {
            const tx = nft.connect(signer2).transferFrom(signer1.address, ethers.constants.AddressZero, getProjectId(projectUrl));
            await expect(tx).to.be.revertedWith('ERC721: caller is not token owner or approved');
        })

        it('setBaseTokenURI not by owner', async () => {
            const tx = nft.connect(signer2).setBaseTokenURI('https://ujjwalnft.com/metadata/')
            await expect(tx).to.be.revertedWith('Ownable: caller is not the owner')
        })

        it('fetching tokenURI of invalid token', async () => {
            let tx = nft.tokenURI(
                getProjectId('invalid projectUrl')
            );
            await expect(tx).to.be.revertedWith('ERC721: invalid token ID')
        })

        it('owner of invalid token', async () => {
            let tx = nft.ownerOf(
                getProjectId('projectUrl')
            );
            await expect(tx).to.be.revertedWith('ERC721: invalid token ID')
        })

        it('mint existing project', async () => {
            const projectUrl = `github.com/ujjwalguptaofficial/jsstore-examples`;
            const tx = nft.mintTo(signer2.address, projectUrl);
            await expect(tx).revertedWith('ERC721: token already minted')
        })

        it('mint other than admin user', async () => {
            const projectUrl = `github.com/ujjwalguptaofficial/jsstore-examplesss`;
            const tx = nft.connect(signer2).mintTo(signer1.address, projectUrl);
            await expect(tx).revertedWith('Ownable: caller is not the owner')
        })
    })

})