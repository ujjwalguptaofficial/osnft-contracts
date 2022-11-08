
import { toUtf8Bytes } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat"
import { describe } from "mocha";
import { testApprover } from "./approver";
import { IDeployedPayload } from "./interfaces";
import { testNFT } from "./nft";



function getProjectId(projectUrl: string) {
    return ethers.utils.keccak256(
        toUtf8Bytes(projectUrl)
    );
}

describe("contracts", () => {

    const payload = {
        projects: {
            "jsstore-example": `github.com/ujjwalguptaofficial/jsstore-examples`,
            "mahal-example": 'github.com/ujjwalguptaofficial/mahal-examples',
            "mahal": 'github.com/ujjwalguptaofficial/mahal',
            "jsstore": 'github.com/ujjwalguptaofficial/jsstore'
        },
        getProjectId
    } as IDeployedPayload;

    before(async () => {
        const [signer1, signer2, signer3, operator, defaultMarketPlace, signer4] = await ethers.getSigners();

        const approverContract = await ethers.getContractFactory('OSNFTApprover');

        const deployedApproverContract = await upgrades.deployProxy(approverContract, [], {
            initializer: 'initialize',
        }) as any;
        payload.approver = deployedApproverContract;


        const ct = await ethers.getContractFactory('OSNFT');
        const deployedContract = await upgrades.deployProxy(ct, ['OpenSourceNFT', 'OS', 'https://ujjwalnft.com/metadata/', payload.approver.address], {
            initializer: 'initialize',
        });

        await deployedContract.deployed();

        deployedContract.

            payload.deployer = signer1;
        payload.signer2 = signer2;
        payload.signer3 = signer3;
        payload.signer4 = signer4;
        payload.operator = operator;
        payload.defaultMarketPlace = defaultMarketPlace;

        payload.nft = deployedContract as any;

        console.log('nft deployed');



    })

    describe('Approver', () => {
        testApprover(payload);
    });

    describe('OSNFT', () => {
        testNFT(payload);
    });
})