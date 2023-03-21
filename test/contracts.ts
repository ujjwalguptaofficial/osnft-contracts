import { ethers, network, run, upgrades } from "hardhat";
import { BigNumber, BigNumberish } from "ethers";
import { IDeployedPayload } from "./interfaces";
import { getProjectId } from "./utils";
import { testNFT } from "./nft";
import { testNFTMeta } from "./nft_meta";


function getSellId(tokenId: BigNumber, from: string) {
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
        mintPrice(star, fork, project) {
            const popularityFactor = 5 * fork + 4 * star;
            const expectedMintPrice = project.basePrice.add(
                project.popularityFactorPrice.mul(popularityFactor)
            );
            return expectedMintPrice;
        },
        transactions: {

        },
        getPercentage(value: BigNumber, percentage: BigNumberish) {
            return value.div(
                100
            ).mul(percentage)
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

    payload.transactions['sellPriorityJsStoreExamples'] = []
    payload.transactions['refundAuctionJsStoreExamples'] = []
    payload.transactions['removeJsStoreExamples'] = []


    before(async () => {
        await network.provider.send("hardhat_reset")

        const [signer1, signer2, signer3, signer4, operator] = await ethers.getSigners();
        payload.deployer = signer1;
        payload.signer2 = signer2;
        payload.signer3 = signer3;
        payload.signer4 = signer4;
        payload.operator = operator;
    })

    it('deploy erc20 token1', async () => {
        const contract = await ethers.getContractFactory('MyToken');

        const deployedContract = await upgrades.deployProxy(
            contract, ["MyToken", "MT"], {
            initializer: 'initialize',
        }) as any;
        payload.erc20Token1 = deployedContract;

        await payload.erc20Token1.mint(payload.deployer.address, '900000000000000000000');
        await payload.erc20Token1.mint(payload.signer4.address, '900000000000000000000');
        await payload.erc20Token1.mint(payload.signer2.address, '900000000000000000000');
        await payload.erc20Token1.mint(payload.signer3.address, '900000000000000000000');
    })

    it('deploy erc20 token 2', async () => {
        const contract = await ethers.getContractFactory('MyToken');

        const deployedContract = await upgrades.deployProxy(
            contract, ["MyToken2", "MT2"], {
            initializer: 'initialize',
        }) as any;
        payload.erc20Token2 = deployedContract;

        await payload.erc20Token2.mint(payload.signer2.address, ethers.constants.MaxUint256);
    })

    describe('OSNFT MEta', () => {
        testNFTMeta(payload);
    });

    describe('OSNFT', () => {
        testNFT(payload);
    });

    describe('deploy subgraph', () => {
        // it('deploy', async () => {
        //     await run('graph', { contractName: 'OSNFT', address: payload.nft.address, blockNumber: 0 })
        // })

        // it('update', async () => {
        //     await run('update', { contractName: 'OSNFT', address: payload.nft.address, blockNumber: 0 })
        // })

        // it('update', async () => {
        //     await run('update', { contractName: 'OSNFT', address: payload.nft.address, blockNumber: 0 })
        // })
    })

    after(async () => {
        console.log(`------contract addresses-------------`);
        const addresses = {
            nft: payload.nft.address,
            // marketplace: payload.marketplace.address,
            // osd: payload.nativeToken.address,
            // approver: payload.approver.address,
            // relayer: payload.relayer.address,
            deployer: payload.deployer.address,
            signer2: payload.signer2.address,
            signer3: payload.signer3.address,
            signer4: payload.signer4.address,
            operator: payload.operator.address,
            erc20Token1: payload.erc20Token1.address,
            erc20Token2: payload.erc20Token2.address
        };
        // console.log(JSON.stringify(addresses));
        console.table(addresses);
        // console.table(payload.transactions);

        // writeJsonFile.sync(`cache/transaction.json`, payload.transactions);
    })
});