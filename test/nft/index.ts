
import { describe } from "mocha";
import { testApprove } from "./approve";
import { IDeployedPayload } from "../interfaces";
import { testMint } from "./mint";
// import { testMinters } from "./minters";
import { testOwnerOf } from "./owner_of";
import { testProjectMeta } from "./project_meta";
import { runPublicState } from "./public_state";
import { setBaseTokenURI } from "./set_base_token_uri";
import { testSetMarketPlace } from "./set_makrketplace";
import { testTransferFrom } from "./transfer_from";

export function testNFT(payload: IDeployedPayload) {


    describe('meta data', () => {
        runPublicState(payload);
    })

    describe('setBaseTokenURI', async () => {
        setBaseTokenURI(payload);
    })

    describe('mint', async () => {
        testMint(payload);
    })

    describe('owner of', async () => {
        testOwnerOf(payload);
    })

    describe('project meta', async () => {
        testProjectMeta(payload);
    })

    describe('approve', async () => {
        testApprove(payload);
    })

    describe('transfer from', async () => {
        testTransferFrom(payload);
    })


    // describe('users method', () => {

    //     describe('transfer from', async () => {

    //         const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-examples'
    //         const projectId = getProjectId(projectUrl1);

    //         it('estimate gas', async () => {
    //             const value = await nft.connect(signer2).estimateGas.transferFrom(
    //                 signer2.address, signer3.address,
    //                 projectId,
    //                 0
    //             );
    //             expect(value).equal(68732);
    //         })

    //         it('transaction', async () => {
    //             const tx = nft.connect(signer2).transferFrom(signer2.address, signer3.address, projectId, 0);
    //             await expect(tx).emit(nft, 'Transfer').withArgs(
    //                 signer2.address, signer3.address, projectId
    //             );

    //             let balance = await nft.balanceOf(signer3.address);
    //             expect(balance).equal(1);

    //             balance = await nft.balanceOf(signer2.address);
    //             expect(balance).equal(0);
    //         });

    //         it('owner of', async () => {
    //             const owner = await nft.ownerOf(
    //                 getProjectId(projectUrl1)
    //             );
    //             expect(owner).equal(signer3.address);
    //         })
    //     })

    //     describe('setApproveForAll', async () => {
    //         const projectUrl1 = 'github.com/ujjwalguptaofficial/mahal-creator'
    //         const projectId = getProjectId(projectUrl1);

    //         it('estimate gas', async () => {
    //             const value = await nft.estimateGas.setApprovalForAll(operator.address, true);
    //             expect(value).equal(54401);
    //         })

    //         it('mint for user3', async () => {
    //             const tx = nft.mintTo(signer3.address, projectUrl1, 0);
    //             await expect(tx).emit(nft, 'Transfer').withArgs(
    //                 ethers.constants.AddressZero, signer3.address,
    //                 projectId
    //             );

    //             let balance = await nft.balanceOf(signer3.address);
    //             expect(balance).equal(2);

    //             const owner = await nft.ownerOf(
    //                 projectId
    //             );
    //             expect(owner).equal(signer3.address);
    //         })

    //         it('transaction', async () => {
    //             const tx = nft.connect(signer3).setApprovalForAll(operator.address, true);
    //             await expect(tx).emit(nft, 'ApprovalForAll').withArgs(
    //                 signer3.address, operator.address, true
    //             )

    //             let isApproved = await nft.isApprovedForAll(signer3.address, operator.address);
    //             expect(isApproved).equal(true);

    //             isApproved = await nft.isApprovedForAll(signer2.address, operator.address);
    //             expect(isApproved).equal(false);
    //         })

    //         it('transfer by operator', async () => {
    //             let balance = await nft.balanceOf(operator.address);
    //             expect(balance).equal(0);

    //             const tx = nft.connect(operator).transferFrom(signer3.address, operator.address, projectId, 0);
    //             await expect(tx).emit(nft, 'Transfer').withArgs(
    //                 signer3.address, operator.address, projectId
    //             );

    //             balance = await nft.balanceOf(operator.address);
    //             expect(balance).equal(1);

    //             balance = await nft.balanceOf(signer3.address);
    //             expect(balance).equal(1);

    //             const owner = await nft.ownerOf(projectId);
    //             expect(owner).equal(operator.address);
    //         })
    //     })
    // })

    // describe('reverted', () => {
    //     it('initialized should revert', async () => {
    //         const tx = nft.initialize('UjjwalNFT', 'UNFT', 'https://ujjwalnft.com/metadata');
    //         await expect(tx).to.be.revertedWith('Initializable: contract is already initialized')
    //     })

    //     it('transfer to zero address should be reverted', async () => {
    //         const tx = nft.transferFrom(signer1.address, ethers.constants.AddressZero,
    //             getProjectId(projectUrl), 0
    //         );
    //         await expect(tx).to.be.revertedWith('ERC721: transfer to the zero address')
    //     })

    //     it('transfer from incorrect owner should be reverted', async () => {
    //         const tx = nft.transferFrom(signer2.address, ethers.constants.AddressZero, getProjectId(projectUrl));
    //         await expect(tx).to.be.revertedWith('ERC721: transfer from incorrect owner')
    //     })

    //     it('transfer on another behalf when not approved', async () => {
    //         const tx = nft.connect(signer2).transferFrom(signer1.address, ethers.constants.AddressZero, getProjectId(projectUrl));
    //         await expect(tx).to.be.revertedWith('ERC721: caller is not token owner or approved');
    //     })

    //     it('setBaseTokenURI not by owner', async () => {
    //         const tx = nft.connect(signer2).setBaseTokenURI('https://ujjwalnft.com/metadata/')
    //         await expect(tx).to.be.revertedWith('Ownable: caller is not the owner')
    //     })

    //     it('fetching tokenURI of invalid token', async () => {
    //         let tx = nft.tokenURI(
    //             getProjectId('invalid projectUrl')
    //         );
    //         await expect(tx).to.be.revertedWith('ERC721: invalid token ID')
    //     })

    //     it('owner of invalid token', async () => {
    //         let tx = nft.ownerOf(
    //             getProjectId('projectUrl')
    //         );
    //         await expect(tx).to.be.revertedWith('ERC721: invalid token ID')
    //     })

    //     it('mint existing project', async () => {
    //         const projectUrl = `github.com/ujjwalguptaofficial/jsstore-examples`;
    //         const tx = nft.mintTo(signer2.address, projectUrl, 0);
    //         await expect(tx).revertedWith('ERC721: token already minted')
    //     })

    //     it('mint other than admin user', async () => {
    //         const projectUrl = `github.com/ujjwalguptaofficial/jsstore-examplesss`;
    //         const tx = nft.connect(signer2).mintTo(signer1.address, projectUrl, 0);
    //         await expect(tx).revertedWith('Ownable: caller is not the owner')
    //     })
    // })

}
