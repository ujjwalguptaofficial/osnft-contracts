
import { expect } from "chai";
import { toUtf8Bytes } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat"
import { describe } from "mocha";
import { testApprover } from "./approver";
import { IDeployedPayload } from "./interfaces";
import { testMarketplace } from "./marketplace";
import { testNFT } from "./nft";



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
            "godam": 'github.com/ujjwalguptaofficial/godam'
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
        payload.defaultMarketPlace = defaultMarketPlace;
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

    it('mint token to owner', async () => {
        const oneToken = ethers.BigNumber.from(10).pow(18);
        const amount = oneToken.mul('10000000000'); // 10 billion
        const nativeToken = payload.nativeToken;

        const devCoin = payload.nativeToken.mint(payload.deployer.address, amount);

        await expect(devCoin).emit(nativeToken, 'Transfer').withArgs(
            ethers.constants.AddressZero, payload.deployer.address, amount
        )

        const decimal = await payload.nativeToken.decimals();

        const gwei = ethers.BigNumber.from(10).pow(13);

        const star = 10000;
        const fork = 100;

        const worth = gwei.mul(star * 4).add(gwei.mul(fork * 2));

        console.log('no of projects mint', worth, ethers.BigNumber.from(10).pow(18).div(worth));

        const balance = await nativeToken.balanceOf(payload.deployer.address);
        expect(balance).equal(amount);
    })

    it('airdrop to different users', async () => {
        const nativeToken = payload.nativeToken;
        const oneToken = ethers.BigNumber.from(10).pow(18);
        await nativeToken.transfer(payload.signer2.address, oneToken);
        await nativeToken.transfer(payload.signer3.address, oneToken);
        await nativeToken.transfer(payload.signer4.address, oneToken);
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
            'OS',
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

        await nativeToken.setOSNFT(nftAddress);

        const allowance = await nativeToken.allowance(payload.deployer.address, nftAddress);

        expect(allowance).greaterThan(0);
        console.log('allowance', allowance);
    })

    it('gas estimate for nft contract deployment', async () => {
        const ct = await ethers.getContractFactory('OSNFT');
        const deploymentData = ct.getDeployTransaction({

        });
        const estimatedGas = await ethers.provider.estimateGas({ data: deploymentData.data });

        expect(estimatedGas).equal(5012976);
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