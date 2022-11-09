import { ethers, upgrades } from "hardhat";
import { describe } from "mocha";
import { IDeployedPayload } from "../interfaces";
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

    it('deploy erc20 token', async () => {
        const contract = await ethers.getContractFactory('MyToken');

        const deployedContract = await upgrades.deployProxy(
            contract, ["MyToken", "MT"], {
            initializer: 'initialize',
        }) as any;
        payload.erc20Token1 = deployedContract;
    })

    describe('payable token', () => {
        testPayableToken(payload);
    });

    describe('sale nft', () => {
        testNFTSale(payload);
    });
}
