import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { OSNFT, OSNFTApprover, OSNFTMarketPlace } from "../typechain-types";
import { MyToken } from "../typechain-types/contracts/erc20.sol";

export interface IDeployedPayload {
    deployer: SignerWithAddress;
    defaultMarketPlace: SignerWithAddress;
    signer2: SignerWithAddress;
    signer3: SignerWithAddress;
    signer4: SignerWithAddress;
    operator: SignerWithAddress;
    nft: OSNFT,
    approver: OSNFTApprover,
    marketplace: OSNFTMarketPlace,
    erc20Token1: MyToken,
    erc20Token2: MyToken,
    projects: {
        'jsstore-example': string;
        'mahal-example': string;
        'mahal': string;
        'jsstore': string;
        'mahal-webpack-loader': string;
    },
    getProjectId: (projectUrl: string) => string
    getSellId: (tokenId: string, from: string) => string
}