
import { expect } from "chai";
import { toUtf8Bytes } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat"
import { describe } from "mocha";
import { testApprover } from "./approver";
import { IDeployedPayload } from "./interfaces";
import { testMarketplace } from "./marketplace";
import { testNFT } from "./nft";
import { testSetMarketPlace } from "./nft/set_makrketplace";
import { testOSD } from "./osd";



function getProjectId(projectUrl: string) {
    return ethers.utils.keccak256(
        toUtf8Bytes(projectUrl)
    );
}
function getSellId(tokenId: string, from: string) {
    return ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['bytes32', 'address'], [tokenId, from])
    );
}

describe("contracts", () => {

    const payload = {
        projects: {
            "jsstore-example": `github.com/ujjwalguptaofficial/jsstore-examples`,
            "mahal-example": 'github.com/ujjwalguptaofficial/mahal-examples',
            "mahal": 'github.com/ujjwalguptaofficial/mahal',
            "mahal-webpack-loader": 'github.com/ujjwalguptaofficial/mahal-webpack-loader',
            "jsstore": 'github.com/ujjwalguptaofficial/jsstore',
            "godam": 'github.com/ujjwalguptaofficial/godam',
            "solidity-learning": 'github.com/ujjwalguptaofficial/solidity-learning',
            "godam-vue": 'github.com/ujjwalguptaofficial/godam-vue',
            "solidity-tip": 'github.com/ujjwalguptaofficial/solidity-tip'
        },
        getProjectId,
        getSellId
    } as IDeployedPayload;

    before(async () => {
        const [signer1, signer2, signer3, operator, defaultMarketPlace, signer4] = await ethers.getSigners();
        payload.deployer = signer1;
        payload.signer2 = signer2;
        payload.signer3 = signer3;
        payload.signer4 = signer4;
        payload.operator = operator;
    })

    it('deploy dev coin', async () => {
        const osdCoin = await ethers.getContractFactory('OSDevCoin');

        const deployedContract = await upgrades.deployProxy(osdCoin, [
            'OSDevCoin', 'OSD'
        ], {
            initializer: 'initialize'
        }) as any;

        payload.nativeToken = deployedContract;
    })

    describe('OSD coin', async () => {
        testOSD(payload);
    })

    // return;


    it('approve contract', async () => {
        const approverContract = await ethers.getContractFactory('OSNFTApprover');

        const deployedApproverContract = await upgrades.deployProxy(approverContract, [], {
            initializer: 'initialize',
        }) as any;
        payload.approver = deployedApproverContract;
    })

    it('deploy nft contracts', async () => {

        console.log('native token', payload.nativeToken.address);

        const ct = await ethers.getContractFactory('OSNFT');

        const deployedContract = await upgrades.deployProxy(ct, [
            'OpenSourceNFT',
            'OSNFT',
            'https://ujjwalnft.com/metadata/',
            payload.approver.address,
            payload.nativeToken.address
        ], {
            initializer: 'initialize',
        });

        await deployedContract.deployed();

        payload.nft = deployedContract as any;

        console.log('nft deployed');
    })

    it('value of native token', async () => {
        const result = await payload.nft.getNativeToken();
        expect(result).equal(payload.nativeToken.address);
    })

    it('set nft address in native coin', async () => {
        const nftAddress = payload.nft.address;
        const allowanceBeforeSet = await payload.nativeToken.allowance(payload.deployer.address, nftAddress);

        expect(allowanceBeforeSet).equal(0);

        const nativeToken = payload.nativeToken;

        const tx = nativeToken.addDefaultOperator(nftAddress);

        await expect(tx).to.emit(nativeToken, 'DefaultOperatorAdded').withArgs(
            nftAddress
        );

        const allowance = await nativeToken.allowance(payload.deployer.address, nftAddress);

        expect(allowance).equal(ethers.constants.MaxUint256);
        console.log('allowance', allowance);
    })


    it('gas estimate for nft contract deployment', async () => {
        const ct = await ethers.getContractFactory('OSNFT');
        const deploymentData = ct.getDeployTransaction({

        });
        const estimatedGas = await ethers.provider.estimateGas({ data: deploymentData.data });

        expect(estimatedGas).equal(5331899);
    })

    it('check for gas in deployment of marketplace', async () => {
        const contract = await ethers.getContractFactory('OSNFTMarketPlace');
        const deploymentData = contract.getDeployTransaction({

        });
        const estimatedGas = await ethers.provider.estimateGas({ data: deploymentData.data });

        expect(estimatedGas).equal(5103535);

    })

    it('deploy marketplace', async () => {
        const contract = await ethers.getContractFactory('OSNFTMarketPlace');

        const deployedContract = await upgrades.deployProxy(contract, [payload.nft.address, payload.nativeToken.address], {
            initializer: 'initialize',
        }) as any;


        payload.marketplace = deployedContract;
    })

    it('set marketplace address as default operator in native coin', async () => {
        const marketplace = payload.marketplace.address;
        const allowanceBeforeSet = await payload.nativeToken.allowance(payload.deployer.address, marketplace);

        expect(allowanceBeforeSet).equal(0);

        const nativeToken = payload.nativeToken;

        const tx = nativeToken.addDefaultOperator(marketplace);

        await expect(tx).to.emit(nativeToken, 'DefaultOperatorAdded').withArgs(
            marketplace
        );

        const allowance = await nativeToken.allowance(payload.deployer.address, marketplace);
        expect(allowance).equal(ethers.constants.MaxUint256);
    })


    describe('setDefaultMarketPlace', async () => {
        testSetMarketPlace(payload);
    })

    describe('Approver', () => {
        testApprover(payload);
    });


    describe('OSNFT', () => {
        testNFT(payload);
    });

    describe('Marketplace', () => {
        testMarketplace(payload);
    });
})