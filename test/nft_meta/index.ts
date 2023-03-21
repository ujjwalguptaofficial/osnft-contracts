import { ethers, upgrades } from "hardhat";
import { IDeployedPayload } from "../interfaces";
import { testPayableToken } from "./payable_token";
import { testVerifier } from "./verifier";

export function testNFTMeta(payload: IDeployedPayload) {

    it('deploy contract', async () => {
        const ct = await ethers.getContractFactory('OSNFTMeta');

        const deployedContract = await upgrades.deployProxy(ct, [

        ], {
            initializer: 'initialize',
        });

        await deployedContract.deployed();

        payload.nftMeta = deployedContract as any;

        // const ctV2 = await ethers.getContractFactory('OSNFTV2');
        // await upgrades.upgradeProxy(payload.nft.address, ctV2);

        // const ctV3 = await ethers.getContractFactory('OSNFTV3');
        // await upgrades.upgradeProxy(payload.nft.address, ctV3);

        console.log('nft deployed');
    })

    describe("payable token", async () => {
        testPayableToken(payload);
    })

    describe("Verifier", async () => {
        testVerifier(payload);
    })
}