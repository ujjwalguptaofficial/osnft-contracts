import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { OSNFT } from "../typechain-types";
import { MyToken } from "../typechain-types/contracts/erc20.sol";

export interface IDeployedPayload {
    deployer: SignerWithAddress;
    signer2: SignerWithAddress;
    signer3: SignerWithAddress;
    signer4: SignerWithAddress;
    operator: SignerWithAddress;
    nft: OSNFT,
    // approver: OSNFTApprover,
    // marketplace: OSNFTMarketPlace,
    erc20Token1: MyToken,
    erc20Token2: MyToken,
    // nativeToken: OSDCoinV2,
    // relayer: OSNFTRelayer,
    projects: {
        'jsstore-example': string;
        'mahal-example': string;
        'mahal': string;
        'jsstore': string;
        'godam': string;
        'mahal-webpack-loader': string;
        'solidity-learning': string;
        'godam-vue': string;
        'solidity-tip': string;
    },
    getProjectId: (projectUrl: string) => BigNumber
    getSellId: (tokenId: BigNumber, from: string) => string,

    transactions: {
        [key: string]: any
    }
}