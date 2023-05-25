import { IDeployedPayload } from "../interfaces";
import { expect } from "chai";

export function testMetaOwnershipTransfer(payload: IDeployedPayload) {
  describe("change owner", async () => {
    it("should revert if non-owner changes ownership", async () => {
      const nft = payload.nftMeta;
      const tx = nft
        .connect(payload.signer2)
        .transferOwnership(payload.signer2.address);

      await expect(tx).to.rejectedWith("Ownable: caller is not the owner");
    });

    it("should revert if the ownership accepter is not pending owner"),
      async () => {
        // const nft = payload.nftMeta;
        // let tx = nft
        //   .connect(payload.deployer)
        //   .transferOwnership(payload.signer2.address);
        // await expect(tx)
        //   .to.emit(nft, "OwnershipTransferStarted")
        //   .withArgs(payload.deployer.address, payload.signer2.address);
        // tx = nft.connect(payload.signer3).acceptOwnership();
        // await expect(tx).to.rejectedWith(
        //   "Ownable2Step: caller is not the new owner"
        // );
      };
  });
}
