import { expect } from "chai";
import { ethers } from "hardhat";
import { IDeployedPayload } from "../interfaces";

function addHours(date: Date, h: number) {
    date.setTime(date.getTime() + (h * 60 * 60 * 1000));
    return date;
}

export function testNFTAuction(payload: IDeployedPayload) {
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
            projectId,
            0,
            1234,
            timestampBefore,
            payload.erc20Token1.address
        );
        await expect(tx).revertedWith('Invalid end date for auction');
    });

    it('auction with zero price', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );

        const tx = marketplace.connect(payload.signer4).createAuction(
            projectId,
            0,
            0,
            new Date().getTime(),
            payload.erc20Token1.address
        );
        await expect(tx).revertedWith('Require bid price above zero');
    });

    it('should be nft owner', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );

        const tx = marketplace.createAuction(
            projectId,
            0,
            10,
            new Date().getTime(),
            payload.erc20Token1.address
        );
        await expect(tx).revertedWith('Require NFT ownership');
    });

    it('require approval', async () => {

        // change default marketplace to default

        const defaultMarketPlace = payload.defaultMarketPlace.address;
        await payload.nft.setDefaultMarketPlace(defaultMarketPlace);


        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );

        const tx = marketplace.connect(payload.signer4).createAuction(
            projectId,
            0,
            10,
            new Date().getTime(),
            payload.erc20Token1.address
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
            projectId,
            0,
            10,
            payload.erc20Token1.address
        );
        const tx2 = marketplace.connect(payload.signer4).createAuction(
            projectId,
            0,
            10,
            new Date().getTime(),
            payload.erc20Token1.address
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

        const tx = marketplace.connect(payload.signer4).createAuction(
            projectId,
            0,
            10,
            new Date().getTime(),
            payload.deployer.address
        );
        await expect(tx).revertedWith('Invalid payment token');
    });

    it('not existing token', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            "ffgg"
        );

        const tx = marketplace.createAuction(
            projectId,
            0,
            10,
            new Date().getTime(),
            payload.deployer.address
        );
        await expect(tx).revertedWith('ERC721: invalid token ID');
    });

    it('successful auction for jsstore example', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const seller = payload.signer4.address;
        const endAuction = addHours(new Date(), 24).getTime();
        const gas = await marketplace.connect(payload.signer4).estimateGas.createAuction(
            projectId,
            0,
            1000,
            endAuction,
            payload.erc20Token1.address
        );
        expect(gas).equal(237623)
        const tx = marketplace.connect(payload.signer4).createAuction(
            projectId,
            0,
            1000,
            endAuction,
            payload.erc20Token1.address
        );
        await expect(tx).emit(marketplace, 'NewAuction').withArgs(
            projectId,
            seller,
            payload.getSellId(projectId, seller),
            0,
            1000,
            endAuction,
            payload.erc20Token1.address
        )
    });
}