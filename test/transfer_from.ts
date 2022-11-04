import { expect } from "chai";
import { IDeployedPayload } from "./interfaces";

export function testTransferFrom(payload: IDeployedPayload) {
    const projectUrl = payload.projects["mahal-example"];
    const projectId = payload.getProjectId(projectUrl);

    it('estimate gas', async () => {
        const value = await payload.nft.connect(payload.signer2).estimateGas.transferFrom(
            payload.signer2.address,
            payload.signer3.address,
            projectId,
            0
        );
        expect(value).equal(68732);
    });
}