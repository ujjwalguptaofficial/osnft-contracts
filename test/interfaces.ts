import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { OSNFT } from "../typechain-types";

export interface IDeployedPayload {
    deployer: SignerWithAddress;
    defaultMarketPlace: SignerWithAddress;
    signer2: SignerWithAddress;
    signer3: SignerWithAddress;
    signer4: SignerWithAddress;
    operator: SignerWithAddress;
    nft: OSNFT,
    projects: {
        'jsstore-example': string;
        'mahal-example': string;
        'mahal': string;
        'jsstore': string;
    },
    getProjectId: (projectUrl: string) => string
}