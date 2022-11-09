import { expect } from "chai";
import { IDeployedPayload } from "../interfaces";

export function testNFTSale(payload: IDeployedPayload) {
    it("add nft on sale by non owner", async () => {
        const marketplace = payload.marketplace;
        const tx = marketplace.connect(payload.signer4).listNFTOnSale(
            payload.getProjectId(
                payload.projects["jsstore-example"]
            ),
            0,
            1000000,
            payload.erc20Token1.address
        );
        await expect(tx).revertedWith('Require NFT ownership');
    });
}
