import { expect } from "chai";
import { IDeployedPayload } from "../interfaces";

export function testNFTBurn(payload: IDeployedPayload) {

    it('burn success', async () => {
        const projectId = payload.getProjectId(payload.projects["mahal-webpack-loader"]);
        const value = await payload.nft.burn(projectId);
        
    })
}