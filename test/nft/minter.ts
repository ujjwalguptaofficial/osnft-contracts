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

        it('success', async () => {
            const nft = payload.nft;

            let isMinter = await nft.isMinter(payload.operator.address);
            expect(isMinter).equal(false);

            const tx = nft.addMinter(payload.operator.address);


            await expect(tx).to.emit(nft, "MinterAdded").withArgs(payload.operator.address);

            isMinter = await nft.isMinter(payload.operator.address);
            expect(isMinter).equal(true);
        })

        it('success', async () => {
            const nft = payload.nft;

            let isMinter = await nft.isMinter(payload.signer3.address);
            expect(isMinter).equal(false);

            const tx = nft.addMinter(payload.signer3.address);


            await expect(tx).to.emit(nft, "MinterAdded").withArgs(payload.signer3.address);

            isMinter = await nft.isMinter(payload.signer3.address);
            expect(isMinter).equal(true);
        })
    })

    describe("remove minter", () => {

        it('not by owner', async () => {
            const nft = payload.nft;
            const tx = nft.connect(payload.signer4).removeMinter(payload.deployer.address);

            await expect(tx).to.revertedWith('Ownable: caller is not the owner')
        })

        it('success', async () => {
            const nft = payload.nft;

            let isMinter = await nft.isMinter(payload.signer3.address);
            expect(isMinter).equal(true);

            const tx = nft.removeMinter(payload.signer3.address);


            await expect(tx).to.emit(nft, "MinterRemoved").withArgs(payload.signer3.address);

            isMinter = await nft.isMinter(payload.signer3.address);
            expect(isMinter).equal(false);
        })
    })
}