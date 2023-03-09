import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { IDeployedPayload } from "../interfaces";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";


export function testMinter(payload: IDeployedPayload) {

    describe("add minter", () => {

        it('not by owner', async () => {
            const nft = payload.nft;

            let isMinter = await nft.isMinter(payload.deployer.address);
            expect(isMinter).equal(false);

            const tx = nft.connect(payload.signer4).addMinter(payload.deployer.address);

            await expect(tx).to.revertedWith('Ownable: caller is not the owner')
        })

        it('success', async () => {
            const nft = payload.nft;

            let isMinter = await nft.isMinter(payload.deployer.address);
            expect(isMinter).equal(false);

            const tx = nft.addMinter(payload.deployer.address);


            await expect(tx).to.emit(nft, "MinterAdded").withArgs(payload.deployer.address);

            isMinter = await nft.isMinter(payload.deployer.address);
            expect(isMinter).equal(true);
        })
    })
}