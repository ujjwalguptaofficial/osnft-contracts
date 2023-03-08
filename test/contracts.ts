import { ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import { IDeployedPayload } from "./interfaces";
import { getProjectId } from "./utils";


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
});