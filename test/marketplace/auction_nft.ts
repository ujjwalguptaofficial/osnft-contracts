import { time } from "@nomicfoundation/hardhat-network-helpers";
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

        const defaultMarketPlace = payload.operator.address;
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

    it('estimate gas for successful auction', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const endAuction = new Date().getTime(); //+ 1000; //addHours(, 24).getTime();
        const gas = await marketplace.connect(payload.signer4).estimateGas.createAuction(
            projectId,
            0,
            1000,
            endAuction,
            payload.erc20Token1.address
        );
        expect(gas).equal(238056)
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
        const tx = marketplace.connect(payload.signer4).createAuction(
            projectId,
            0,
            1000,
            endAuction,
            payload.erc20Token1.address
        );
        const auctionId = payload.getSellId(projectId, seller);
        await expect(tx).emit(marketplace, 'NewAuction').withArgs(
            projectId,
            seller,
            auctionId,
            0,
            1000,
            endAuction,
            payload.erc20Token1.address
        )

        const newOwner = await payload.nft.ownerOf(projectId);
        expect(newOwner).equal(marketplace.address);

        const bidOwner = await marketplace.getBidOwner(auctionId);
        expect(bidOwner).equal(ethers.constants.AddressZero);


        const bidPrice = await marketplace.getBidPrice(auctionId);
        expect(bidPrice).equal(1000);
    });

    it('require share greater than zero', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore"]
        );

        const tx = marketplace.createAuction(
            projectId,
            0,
            1000,
            new Date().getTime(),
            payload.deployer.address
        );
        await expect(tx).revertedWith('Require input share to be above zero');
    });

    it('Placing share by not owner', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore"]
        );

        const tx = marketplace.connect(payload.signer4).createAuction(
            projectId,
            1,
            1000,
            new Date().getTime(),
            payload.deployer.address
        );
        await expect(tx).revertedWith('Owns less share than input');
    });

    it('Placing share greater than own', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore"]
        );

        const tx = marketplace.createAuction(
            projectId,
            10000,
            1000,
            new Date().getTime(),
            payload.erc20Token1.address
        );
        await expect(tx).revertedWith('Owns less share than input');
    });

    it('estimate gas for successful share auction', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore"]
        );
        const endAuction = addHours(new Date(), 24).getTime();

        const gas = await marketplace.estimateGas.createAuction(
            projectId,
            100,
            10000,
            endAuction,
            payload.erc20Token1.address
        );
        expect(gas).equal(243432)
    })

    it('successful share auction', async () => {
        const marketplace = payload.marketplace;
        const projectId = payload.getProjectId(
            payload.projects["jsstore"]
        );
        const seller = payload.deployer.address;
        // const endAuction = addHours(new Date(), 24).getTime();
        const endAuction = (await time.latest()) + 200;
        const tx = marketplace.createAuction(
            projectId,
            100,
            10000,
            endAuction,
            payload.erc20Token1.address
        );
        const auctionId = payload.getSellId(projectId, seller);
        await expect(tx).emit(marketplace, 'NewAuction').withArgs(
            projectId,
            seller,
            auctionId,
            100,
            10000,
            endAuction,
            payload.erc20Token1.address
        )

        const shareOfMarketPlace = await payload.nft.shareOf(projectId, marketplace.address);
        expect(shareOfMarketPlace).equal(100);

        const bidOwner = await marketplace.getBidOwner(auctionId);
        expect(bidOwner).equal(ethers.constants.AddressZero);


        const bidPrice = await marketplace.getBidPrice(auctionId);
        expect(bidPrice).equal(10000);
    });

}