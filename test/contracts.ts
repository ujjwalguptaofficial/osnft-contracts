
import { expect } from "chai";
import { toUtf8Bytes } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat"
import { describe } from "mocha";
import { testApprover } from "./approver";
import { deployApprover } from "./approver/deploy_contract";
import { IDeployedPayload } from "./interfaces";
import { testMarketplace } from "./marketplace";
import { testNFT } from "./nft";
import { deployNFTContract } from "./nft/deploy_contract";
import { testSetMarketPlace } from "./nft/set_makrketplace";
import { testOSD } from "./osd";
import { testRelayer } from "./relayer";
const writeJsonFile = require("write-json");



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
        getSellId,
        transactions: {

        }
    } as IDeployedPayload;

    payload.transactions['sellJsStoreExamples'] = []
    payload.transactions['sellJsStore'] = []
    payload.transactions['sellMahalExamples'] = []
    payload.transactions['sellMahalWebpackLoader'] = []
    payload.transactions['buyJsStoreExample'] = []
    payload.transactions['buyMahalExample'] = []
    payload.transactions['buyJsStore'] = []
    payload.transactions['bidJsStoreExamples'] = []
    payload.transactions['bidJsStore'] = []
    payload.transactions['buyMahalWebpackLoader'] = []


    before(async () => {
        await network.provider.send("hardhat_reset")

        const [signer1, signer2, signer3, operator, defaultMarketPlace, signer4] = await ethers.getSigners();
        payload.deployer = signer1;
        payload.signer2 = signer2;
        payload.signer3 = signer3;
        payload.signer4 = signer4;
        payload.operator = operator;
    })

    it('deploy OSD coin', async () => {
        const osdCoin = await ethers.getContractFactory('OSDCoin');

        const deployedContract = await upgrades.deployProxy(osdCoin, [
            'OpenSourceDevCoin', 'OSD'
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
        await deployApprover(payload);
    })

    it('deploy nft contracts', async () => {
        await deployNFTContract(payload);
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

        expect(estimatedGas).within(4927274, 4927275);
    })

    it('check for gas in deployment of marketplace', async () => {
        const contract = await ethers.getContractFactory('OSNFTMarketPlace');
        const deploymentData = contract.getDeployTransaction({

        });
        const estimatedGas = await ethers.provider.estimateGas({ data: deploymentData.data });

        expect(estimatedGas).equal(4380377);

    })

    it('deploy marketplace', async () => {
        const contract = await ethers.getContractFactory('OSNFTMarketPlace');

        const deployedContract = await upgrades.deployProxy(contract, [payload.nft.address, payload.nativeToken.address], {
            initializer: 'initialize',
        }) as any;


        payload.marketplace = deployedContract;
    })

    describe('test relayer', () => {
        testRelayer(payload);
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

    it('transfer ether to', async () => {
        const tx = await payload.deployer.sendTransaction({
            value: ethers.utils.parseEther("2"),
            to: "0xF0a7103a92fCC2e23600B40Fa5692857Db7E0F4F"
        });
        return tx.wait();
    })

    after(async () => {
        console.log(`------contract addresses-------------`);
        const addresses = {
            nft: payload.nft.address,
            marketplace: payload.marketplace.address,
            osd: payload.nativeToken.address,
            approver: payload.approver.address,
            relayer: payload.relayer.address,
            deployer: payload.deployer.address,
            signer2: payload.signer2.address,
            signer3: payload.signer3.address,
            signer4: payload.signer4.address,
            operator: payload.operator.address,
            erc20Token1: payload.erc20Token1.address,
            erc20Token2: payload.erc20Token2.address
        };
        console.log(JSON.stringify(addresses));
        console.table(addresses);
        // console.table(payload.transactions);

        writeJsonFile.sync(`cache/transaction.json`, payload.transactions);
    })
})