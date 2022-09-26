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
                const gas = await nft.estimateGas.mint(projectUrl, signer1.address);
                // expect(gas).equal(195491);
                expect(gas).equal(149566);
            })

            it('transaction', async () => {
                let balance = await nft.balanceOf(signer1.address);
                expect(balance).equal(0);

                const expectedTokenId = getProjectId(
                    projectUrl
                );
                const tx = nft.mint(projectUrl, signer1.address);
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
                const tx = nft.mint(projectUrl1, signer2.address);
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

        // describe('transfer from', async () => {

        //     it('estimate gas', async () => {
        //         const value = await nft.connect(signer2).estimateGas.transferFrom(signer2.address, signer3.address, 2);
        //         expect(value).equal(68955);
        //     })

        //     it('transaction', async () => {
        //         const tx = nft.connect(signer2).transferFrom(signer2.address, signer3.address, 2);
        //         await expect(tx).emit(nft, 'Transfer').withArgs(
        //             signer2.address, signer3.address, 2
        //         );

        //         let balance = await nft.balanceOf(signer3.address);
        //         expect(balance).equal(1);

        //         balance = await nft.balanceOf(signer2.address);
        //         expect(balance).equal(0);
        //     });

        //     it('owner of', async () => {
        //         const owner = await nft.ownerOf(2);
        //         expect(owner).equal(signer3.address);
        //     })
        // })

        // describe('setApproveForAll', async () => {
        //     it('estimate gas', async () => {
        //         const value = await nft.estimateGas.setApprovalForAll(operator.address, true);
        //         expect(value).equal(54468);
        //     })

        //     it('mint by user3', async () => {
        //         const tx = nft.connect(signer3).mint();
        //         await expect(tx).emit(nft, 'Transfer').withArgs(
        //             ethers.constants.AddressZero, signer3.address, 3
        //         );

        //         let balance = await nft.balanceOf(signer3.address);
        //         expect(balance).equal(2);

        //         const owner = await nft.ownerOf(3);
        //         expect(owner).equal(signer3.address);
        //     })

        //     it('transaction', async () => {
        //         const tx = nft.connect(signer3).setApprovalForAll(operator.address, true);
        //         await expect(tx).emit(nft, 'ApprovalForAll').withArgs(
        //             signer3.address, operator.address, true
        //         )

        //         let isApproved = await nft.isApprovedForAll(signer3.address, operator.address);
        //         expect(isApproved).equal(true);

        //         isApproved = await nft.isApprovedForAll(signer2.address, operator.address);
        //         expect(isApproved).equal(false);
        //     })

        //     it('transfer by operator', async () => {
        //         let balance = await nft.balanceOf(operator.address);
        //         expect(balance).equal(0);

        //         const tx = nft.connect(operator).transferFrom(signer3.address, operator.address, 3);
        //         await expect(tx).emit(nft, 'Transfer').withArgs(
        //             signer3.address, operator.address, 3
        //         );

        //         balance = await nft.balanceOf(operator.address);
        //         expect(balance).equal(1);

        //         balance = await nft.balanceOf(signer3.address);
        //         expect(balance).equal(1);

        //         const owner = await nft.ownerOf(3);
        //         expect(owner).equal(operator.address);
        //     })
        // })
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
            const tx = nft.mint(projectUrl, signer2.address);
            await expect(tx).revertedWith('ERC721: token already minted')
        })

        it('mint other than admin user', async () => {
            const projectUrl = `github.com/ujjwalguptaofficial/jsstore-examplesss`;
            const tx = nft.connect(signer2).mint(projectUrl, signer1.address);
            await expect(tx).revertedWith('Ownable: caller is not the owner')
        })
    })

})