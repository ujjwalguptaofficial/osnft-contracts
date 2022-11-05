import { expect } from "chai";
import { ethers } from "ethers";
import { IDeployedPayload } from "./interfaces";

export function testMint(payload: IDeployedPayload) {

    it('estimate gas', async () => {
        const nft = payload.nft;
        const gas = await nft.estimateGas.mintTo(
            payload.deployer.address, payload.projects["jsstore-example"],
            0,
            30
        );
        expect(gas).equal(110223);
    });

    describe('percentage cut', async () => {

        it('mint percentag cut project', async () => {
            const nft = payload.nft;
            const deployerAddress = payload.deployer.address;
            const projectUrl = payload.projects["jsstore-example"];

            const oldBalance = await nft.balanceOf(deployerAddress);
            expect(oldBalance).equal(0);

            const expectedTokenId = payload.getProjectId(
                projectUrl
            );

            const tx = nft.mintTo(deployerAddress, projectUrl, 0, 30);
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

        it('mint another project by percentage cut for general user', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            let balance = await nft.balanceOf(address);
            expect(balance).equal(0);

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'
            const expectedTokenId = payload.getProjectId(projectUrl1);
            const tx = nft.mintTo(address, projectUrl1, 0, 40);
            await expect(tx).emit(nft, 'Transfer').withArgs(
                ethers.constants.AddressZero, address, expectedTokenId
            );

            await expect(tx).emit(nft, 'ProjectAdded').withArgs(
                projectUrl1, 0, 40
            );

            balance = await nft.balanceOf(address);
            expect(balance).equal(1);
        });

        it('mint by not owner', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-exampless'
            const tx = nft.connect(payload.signer2).mintTo(address, projectUrl1, 0, 30);
            await expect(tx).rejectedWith('only minters allowed')
        })

        it('mint already minted', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'
            const tx = nft.mintTo(address, projectUrl1, 0, 30);

            await expect(tx).to.revertedWith('ERC721: token already minted');
        })
    })

    describe('shares', async () => {
        it('mint a project with shares more than uint32 max value', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'
            try {
                const tx = await nft.mintTo(address, projectUrl1, 1, 4294967295 + 1);
            } catch (error: any) {
                expect(error.message.includes('value out-of-bounds')).equal(true)
            }
        })

        it('mint a project with zero shares', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;
            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal'
            const tx = nft.mintTo(address, projectUrl1, 1, 0);
            await expect(tx).to.revertedWith('total share should not be zero')
        })

        it('mint a percentage cut project with shares', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'
            const tx = nft.mintTo(address, projectUrl1, 1, 10000);

            await expect(tx).to.revertedWith('ERC721: token already minted');
        })

        it('mint a project', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            let balance = await nft.balanceOf(address);
            expect(balance).equal(1);

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal'
            const expectedTokenId = payload.getProjectId(projectUrl1);
            const tx = nft.mintTo(address, projectUrl1, 1, 10000);
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
            const tx = nft.mintTo(address, projectUrl1, 1, 10000);

            await expect(tx).to.revertedWith('ERC721: token already minted');

        });

        it('mint share project with percentage cut', async () => {
            const nft = payload.nft;
            const address = payload.signer2.address;

            const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal'
            const expectedTokenId = payload.getProjectId(projectUrl1);
            const tx = nft.mintTo(address, projectUrl1, 1, 0);

            await expect(tx).to.revertedWith('ERC721: token already minted');

        });
    })


}