import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { describe } from "mocha";
import { IDeployedPayload } from "../interfaces";
import { testNFTAuction } from "./auction_nft";
import { testBidNFTAuction } from "./bid_nft";
import { testNFTBuy } from "./buy_nft";
import { testPayableToken } from "./payable_token";
import { testNFTSale } from "./sell_nft";


export function testMarketplace(payload: IDeployedPayload) {

    it('deploy marketplace', async () => {
        const contract = await ethers.getContractFactory('OSNFTMarketPlace');

        const deployedContract = await upgrades.deployProxy(contract, [payload.nft.address], {
            initializer: 'initialize',
        }) as any;


        payload.marketplace = deployedContract;
    })

    it('check for gas in deployed', async () => {
        const contract = await ethers.getContractFactory('OSNFTMarketPlace');
        const deploymentData = contract.getDeployTransaction({

        });
        const estimatedGas = await ethers.provider.estimateGas({ data: deploymentData.data });

        expect(estimatedGas).equal(3965433);

    })

    it('deploy erc20 token', async () => {
        const contract = await ethers.getContractFactory('MyToken');

        const deployedContract = await upgrades.deployProxy(
            contract, ["MyToken", "MT"], {
            initializer: 'initialize',
        }) as any;
        payload.erc20Token1 = deployedContract;

        await payload.erc20Token1.mint(payload.deployer.address, 900000000000);
        await payload.erc20Token1.mint(payload.signer4.address, 900000000000);
        await payload.erc20Token1.mint(payload.signer2.address, 900000000000);
    })

    describe('payable token', () => {
        testPayableToken(payload);
    });

    describe('sale nft', () => {
        testNFTSale(payload);
    });

    describe('buy nft', () => {
        testNFTBuy(payload);
    });

    describe('auction nft', () => {
        testNFTAuction(payload);
    });

    describe('bid nft', () => {
        testBidNFTAuction(payload);
    });
}
