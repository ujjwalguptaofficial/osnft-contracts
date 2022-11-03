import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { OSNFT } from "../typechain-types";

export interface IDeployedPayload {
    deployer: SignerWithAddress;
    signer2: SignerWithAddress;
    signer3: SignerWithAddress;
    operator: SignerWithAddress;
    nft: OSNFT,
    projects: {
        'jsstore-example': string
    },
    getProjectId: (projectUrl: string) => string
}