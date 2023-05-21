import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { IDeployedPayload } from "../interfaces";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

export function testMintRoyaltyUpdate(payload: IDeployedPayload) {
  it("lets owner update mintRoyalty", async () => {
    const nft = payload.nft;

    await expect(nft.connect(payload.deployer).updateMintRoyalty("12"))
      .to.emit(nft, "MintRoyaltyUpdated")
      .withArgs(12);
  });

  it("reverts on non-owner updating mintRoyalty", async () => {
    const nft = payload.nft;

    await expect(
      nft.connect(payload.signer2).updateMintRoyalty("12")
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
}

export function testBurnRoyaltyUpdate(payload: IDeployedPayload) {
  it("lets owner update burnRoyalty", async () => {
    const nft = payload.nft;

    await expect(nft.connect(payload.deployer).updateBurnRoyalty("22"))
      .to.emit(nft, "BurnRoyaltyUpdated")
      .withArgs(22);
  });

  it("reverts on non-owner updating burnRoyalty", async () => {
    const nft = payload.nft;

    await expect(
      nft.connect(payload.signer2).updateMintRoyalty("22")
    ).to.revertedWith("Ownable: caller is not the owner");
  });
}
